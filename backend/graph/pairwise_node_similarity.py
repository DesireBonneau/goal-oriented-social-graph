from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable, Optional, Any, Dict, List, Tuple


# ----------------------------
# Data structures
# ----------------------------

@dataclass(frozen=True)
class Experience:
    company: Optional[str]
    industry: Optional[Any]
    end_date: Optional[date]  # None = current
    start_date: Optional[date] = None
    location: Optional[str] = None
    country: Optional[str] = None
    duration_months: Optional[float] = None


@dataclass(frozen=True)
class UserProfile:
    user_id: str
    faculty: Optional[str]
    major: Optional[str]
    minor: Optional[str]
    internships: Iterable[Experience]
    jobs: Iterable[Experience]
    preferred_location: Optional[str]


# ----------------------------
# Similarity helpers
# ----------------------------

def _normalize_str(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip().lower()
    return value if value else None


def _exact_match(a: Optional[str], b: Optional[str]) -> float:
    a_norm = _normalize_str(a)
    b_norm = _normalize_str(b)
    if a_norm is None or b_norm is None:
        return 0.0
    return 1.0 if a_norm == b_norm else 0.0


def _as_set(value: Any) -> Optional[set]:
    if value is None:
        return None
    if isinstance(value, (list, tuple, set)):
        return {str(v).strip().lower() for v in value if str(v).strip()}
    return {str(value).strip().lower()} if str(value).strip() else None


def _jaccard(a: Optional[set], b: Optional[set]) -> float:
    if not a or not b:
        return 0.0
    inter = a.intersection(b)
    union = a.union(b)
    return len(inter) / len(union) if union else 0.0


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y/%m"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
    return None


def _months_between(start: Optional[date], end: Optional[date]) -> Optional[float]:
    if start is None or end is None:
        return None
    if end < start:
        return 0.0
    return (end.year - start.year) * 12 + (end.month - start.month)


def _years_since(d: Optional[date], today: Optional[date] = None) -> float:
    if d is None:
        return 0.0  # current -> 0 years since
    if today is None:
        today = date.today()
    return max(0.0, (today - d).days / 365.25)


def _recency_weight(end_date: Optional[date], half_life_months: float = 36.0, hard_cutoff_years: float = 20.0) -> float:
    """
    Converts recency into a [0,1] weight.
    """
    years = _years_since(end_date)
    if years >= hard_cutoff_years:
        return 0.0
    half_life_years = max(0.1, half_life_months / 12.0)
    return 0.5 ** (years / half_life_years)


def _numeric_similarity(a: Optional[float], b: Optional[float], range_max: Optional[float] = None) -> float:
    if a is None or b is None:
        return 0.0
    if range_max is None or range_max <= 0:
        range_max = max(a, b, 1.0)
    return max(0.0, 1.0 - abs(a - b) / range_max)


def _experience_similarity(
    a: Iterable[Experience],
    b: Iterable[Experience],
    *,
    w_company: float = 0.37,
    w_industry: float = 0.28,
    w_duration: float = 0.15,
    w_recency: float = 0.15,
    w_country: float = 0.05,
    half_life_months: float = 36.0,
) -> float:
    """
    Best-match strategy across experiences with mixed matching:
    - company: exact
    - industry: Jaccard if list-like, else exact
    - duration: numeric similarity (months)
    - recency: exponential decay weight
    - country: exact
    """
    a_list = list(a)
    b_list = list(b)
    if not a_list or not b_list:
        return 0.0

    total = 0.0
    weight_sum = 0.0

    for exp_a in a_list:
        recency = _recency_weight(exp_a.end_date, half_life_months=half_life_months)
        if recency == 0.0:
            continue

        best = 0.0
        for exp_b in b_list:
            company_sim = _exact_match(exp_a.company, exp_b.company)

            industry_a = _as_set(exp_a.industry)
            industry_b = _as_set(exp_b.industry)
            industry_sim = _jaccard(industry_a, industry_b) if industry_a and industry_b else _exact_match(
                exp_a.industry if isinstance(exp_a.industry, str) else None,
                exp_b.industry if isinstance(exp_b.industry, str) else None,
            )

            duration_sim = _numeric_similarity(exp_a.duration_months, exp_b.duration_months)

            country_sim = _exact_match(exp_a.country or exp_a.location, exp_b.country or exp_b.location)

            sim = (
                w_company * company_sim +
                w_industry * industry_sim +
                w_duration * duration_sim +
                w_recency * recency +
                w_country * country_sim
            )
            if sim > best:
                best = sim

        total += recency * best
        weight_sum += recency

    return total / weight_sum if weight_sum > 0 else 0.0


# ----------------------------
# MongoDB document helpers
# ----------------------------

def _extract_experiences(items: Iterable[Dict[str, Any]]) -> List[Experience]:
    results: List[Experience] = []
    for raw in items or []:
        start_date = _parse_date(raw.get("start_date"))
        end_date = _parse_date(raw.get("end_date"))
        duration = raw.get("duration_months")
        if duration is None:
            duration = _months_between(start_date, end_date) if end_date else _months_between(start_date, date.today())

        results.append(
            Experience(
                company=raw.get("company"),
                industry=raw.get("industry"),
                start_date=start_date,
                end_date=end_date,
                location=raw.get("location"),
                country=raw.get("country"),
                duration_months=duration,
            )
        )
    return results


# ----------------------------
# Main pairwise similarity
# ----------------------------

def pairwise_similarity_from_mongo_docs(
    u: Dict[str, Any],
    v: Dict[str, Any],
    *,
    weights: Optional[Dict[str, Any]] = None,
    half_life_months: float = 36.0,
) -> float:
    """
    Extended Gower similarity for MongoDB user documents.
    Output is in [0,1].
    """
    weights = weights or {}

    w_faculty = weights.get("faculty", 0.10)
    w_major = weights.get("major", 0.25)
    w_minor = weights.get("minor", 0.12)
    w_preferred_work_country = weights.get("preferred_work_country", 0.08)

    exp_weights = weights.get("professional_experience", {})
    w_exp_total = exp_weights.get("total", 0.45)
    w_company = exp_weights.get("company", 0.37)
    w_industry = exp_weights.get("industry", 0.28)
    w_duration = exp_weights.get("duration", 0.15)
    w_recency = exp_weights.get("recency", 0.15)
    w_country = exp_weights.get("country", 0.05)

    sims: List[float] = []
    ws: List[float] = []

    sims.append(_exact_match(u.get("faculty"), v.get("faculty")))
    ws.append(w_faculty)

    sims.append(_exact_match(u.get("major"), v.get("major")))
    ws.append(w_major)

    sims.append(_exact_match(u.get("minor"), v.get("minor")))
    ws.append(w_minor)

    sims.append(_exact_match(u.get("preferred_work_country"), v.get("preferred_work_country")))
    ws.append(w_preferred_work_country)

    u_internships = _extract_experiences(u.get("internships", []))
    v_internships = _extract_experiences(v.get("internships", []))
    u_jobs = _extract_experiences(u.get("jobs", []))
    v_jobs = _extract_experiences(v.get("jobs", []))

    exp_sim = 0.5 * _experience_similarity(
        u_internships, v_internships,
        w_company=w_company,
        w_industry=w_industry,
        w_duration=w_duration,
        w_recency=w_recency,
        w_country=w_country,
        half_life_months=half_life_months,
    ) + 0.5 * _experience_similarity(
        u_jobs, v_jobs,
        w_company=w_company,
        w_industry=w_industry,
        w_duration=w_duration,
        w_recency=w_recency,
        w_country=w_country,
        half_life_months=half_life_months,
    )

    sims.append(exp_sim)
    ws.append(w_exp_total)

    total_weight = sum(ws)
    if total_weight == 0:
        return 0.0
    return sum(s * w for s, w in zip(sims, ws)) / total_weight
