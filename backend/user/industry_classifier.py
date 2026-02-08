from __future__ import annotations
import unicodedata
from pathlib import Path
from typing import Optional, List
import requests
from requests.exceptions import RequestException
import json
from typing import Tuple
import random
import time


# Helper functions to check any failed output from the Gemini API
class GeminiRateLimited(Exception):
    """
    Raised when Gemini returns HTTP 429 (rate/quota limit).
    """
    def __init__(self, retry_after_s: float | None = None, body: str = ""):
        super().__init__("Gemini rate-limited (HTTP 429)")
        self.retry_after_s = retry_after_s
        self.body = body


class GeminiHTTPError(Exception):
    """
    Raised for non-2xx responses other than 429.
    """
    def __init__(self, status_code: int, body: str = ""):
        super().__init__(f"Gemini HTTP error {status_code}")
        self.status_code = status_code
        self.body = body


_INDUSTRIES_FILE = Path(__file__).with_name("industries.txt")
_API_KEY_FILE = Path(__file__).with_name("gemini_api_key.txt")
_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def _read_api_key():
    # important because api key is in .gitignore
    if _API_KEY_FILE.exists():
        return _API_KEY_FILE.read_text(encoding="utf-8").strip()
    return None


def _normalize_industry(value: str) -> str:
    value = unicodedata.normalize("NFKC", value)
    value = value.strip().strip('"').strip("'").strip().strip(",")
    value = " ".join(value.split())  # collapse whitespace
    return value.casefold()


def _load_industries() -> List[str]:
    if not _INDUSTRIES_FILE.exists():
        return []
    return [
        line.strip()
        for line in _INDUSTRIES_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


INDUSTRIES: List[str] = _load_industries()
_NORMALIZED_TO_CANONICAL = {_normalize_industry(industry): industry for industry in INDUSTRIES}


def _gemini_classify(position: str, company: str) -> Optional[List[tuple[str, float]]]:
    api_key = _read_api_key()
    if not api_key:
        raise ValueError("Missing Gemini API key.")
    if not INDUSTRIES:
        raise ValueError("Industries list is empty.")

    prompt = (
        "Pick up to 3 industries from the list that best match the job.\n"
        "Return ONLY valid JSON in this exact format:\n"
        '[["Industry Name", score], ["Industry Name", score], ...]\n'
        "Rules:\n"
        "- Output 1 to 3 items ONLY (no extra text).\n"
        "- Each Industry Name MUST be exactly one of the industries in the list.\n"
        "Scoring rules:\n"
        "- Return BETWEEN 1 AND 3 industries (1 if only one is clearly appropriate).\n"
        "- score MUST be a float between 0.0 and 1.0.\n"
        "- The scores across all returned items MUST SUM TO EXACTLY 1.\n"
        "- Sort the list by score descending.\n"
        "- Use lower scores when uncertain; do NOT give multiple industries very high scores unless strongly justified.\n"
        "- Industry Name MUST match EXACTLY one item from the Industries list (same spelling and punctuation).\n\n"
        f"Industries: {', '.join(INDUSTRIES)}\n\n"
        f"Position: {position}\n"
        f"Company: {company}\n"
    )

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(
            _GEMINI_URL,
            params={"key": api_key},
            headers=headers,
            json=payload,
            timeout=20,
        )

        # Before adding the changes which check if the API call works
        # response.raise_for_status()

        # Handle HTTP errors explicitly so we can distinguish causes
        if response.status_code == 429:
            # Best-effort parse of "Please retry in Xs" from the error message
            retry_after = None
            try:
                msg = response.json().get("error", {}).get("message", "")
                import re
                m = re.search(r"retry in ([0-9.]+)s", msg)
                if m:
                    retry_after = float(m.group(1))
            except Exception:
                pass

            raise GeminiRateLimited(retry_after_s=retry_after, body=response.text)

        if not response.ok:
            raise GeminiHTTPError(status_code=response.status_code, body=response.text)

        # If we reach here, it's a 2xx
        data = response.json()

        raw = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )

        # Parse JSON list
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return None

        results: List[Tuple[str, float]] = []
        for item in parsed[:3]:
            if (
                    isinstance(item, list)
                    and len(item) == 2
                    and isinstance(item[0], str)
                    and isinstance(item[1], (int, float))
            ):
                name = item[0].strip()
                pct = float(item[1])

                # normalize + validate against your industries list
                normalized = _normalize_industry(name)
                if normalized in _NORMALIZED_TO_CANONICAL and 0.0 <= pct <= 1.0:
                    results.append((_NORMALIZED_TO_CANONICAL[normalized], pct))

        if results:
            s = sum(p for _, p in results)
            if not (0.98 <= s <= 1.02):
                # Renormalize to sum to 1 (only if sum is non-zero)
                if s > 0:
                    results = [(i, p / s) for i, p in results]

        return results or None

    # Handling the potential API errors
    except (GeminiRateLimited, GeminiHTTPError):
        raise
    except (RequestException, json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
        return None


def get_industry(position: str, company: str):  # -> List[tuple[str, float]]
    try:
        gemini_result = _gemini_classify(position, company)
        if gemini_result:
            return gemini_result
        raise ValueError("Gemini returned no usable classification (empty/invalid output).")

    except GeminiRateLimited as e:
        raise

    except GeminiHTTPError as e:
        raise

    except (RequestException, json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError) as e:
        raise ValueError(f"Gemini classification failed: {e}") from e


def get_industry_with_retry(position: str, company: str, *, max_attempts: int = 5, base_sleep_s: float = 10.0,) \
        -> list[tuple[str, float]]:
    """
    Calls get_industry() and retries transient failures.

    Retries on:
      - GeminiRateLimited (429)
      - GeminiHTTPError with 5xx
      - RequestException (network)
      - "Gemini returned no usable classification" (None/invalid output)

    Raises after max_attempts.
    """
    last_exc: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            result = get_industry(position, company)

            # Treat None or empty as failure (your current "no usable classification" case)
            if not result:
                raise ValueError("Gemini returned no usable classification (empty/invalid output).")

            return result

        # HTTP 429 (too many requests) -> sleep and retry
        except GeminiRateLimited as e:
            last_exc = e
            # If you parsed a retry hint, respect it; otherwise use base_sleep_s
            sleep_s = e.retry_after_s if getattr(e, "retry_after_s", None) else base_sleep_s

        # Any non-2xx except 429 (401/403/404/500/503, etc.)
        # 5xx -> sleep and retry
        # 4xx except 429 -> raises error (WON'T HAPPEN OR WE ARE FUCKED) and do not retry
        except GeminiHTTPError as e:
            last_exc = e
            # Retry only for transient server errors
            if e.status_code not in (500, 502, 503, 504):
                raise
            sleep_s = base_sleep_s

        # Network/timeouts -> sleep and retry
        except RequestException as e:
            last_exc = e
            sleep_s = base_sleep_s

        # Wrong output format -> sleep and retry
        except ValueError as e:
            # This catches your "no usable classification" error
            last_exc = e
            sleep_s = base_sleep_s

        # Small jitter prevents multiple processes syncing
        sleep_s = sleep_s * (1.0 + random.uniform(0, 0.2))
        time.sleep(sleep_s)

    # exhausted attempts
    return []


if __name__ == "__main__":
    # Testing

    print(get_industry("Mechanical Engineer", "Tesla"))
    print(get_industry("Pharmacist", "Pfizer"))
    print(get_industry("Mining Engineering", "BP"))
    print(get_industry("Software Engineer", "Google"))
    print(get_industry("Data Scientist", "Amazon"))
    print(get_industry("Cybersecurity Analyst", "CrowdStrike"))
    print(get_industry("Investment Banking Analyst", "Goldman Sachs"))
    print(get_industry("Registered Nurse", "McGill University Health Centre"))
    print(get_industry("Civil Engineer", "AECOM"))
    print(get_industry("Marketing Manager", "Coca-Cola"))
    print(get_industry("Product Manager", "Shopify"))
    print(get_industry("Teacher", "McGill University"))
    print(get_industry("Supply Chain Manager", "DHL"))
    print(get_industry("Architect", "Gensler"))
    print(get_industry("HR Generalist", "Deloitte"))
    print(get_industry("Restaurant Manager", "McDonald's"))
    print(get_industry("Semiconductor Process Engineer", "TSMC"))
    print(get_industry("Aerospace Engineer", "Boeing"))
    print(get_industry("Renewable Energy Analyst", "Ørsted"))
    print(get_industry("Mechanical Engineer", "Tesla"))
    print(get_industry("Pharmacist", "Pfizer"))
    print(get_industry("Mining Engineering", "BP"))
    print(get_industry("Software Engineer", "Google"))
    print(get_industry("Data Scientist", "Amazon"))
    print(get_industry("Cybersecurity Analyst", "CrowdStrike"))
    print(get_industry("Investment Banking Analyst", "Goldman Sachs"))
    print(get_industry("Registered Nurse", "McGill University Health Centre"))
    print(get_industry("Civil Engineer", "AECOM"))
    print(get_industry("Marketing Manager", "Coca-Cola"))
    print(get_industry("Product Manager", "Shopify"))
    print(get_industry("Teacher", "McGill University"))
    print(get_industry("Supply Chain Manager", "DHL"))
    print(get_industry("Architect", "Gensler"))
    print(get_industry("HR Generalist", "Deloitte"))
    print(get_industry("Restaurant Manager", "McDonald's"))
    print(get_industry("Semiconductor Process Engineer", "TSMC"))
    print(get_industry("Aerospace Engineer", "Boeing"))
    print(get_industry("Renewable Energy Analyst", "Ørsted"))