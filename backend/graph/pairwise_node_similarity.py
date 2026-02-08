from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional


# ----------------------------
# Data structures
# ----------------------------

@dataclass(frozen=True)
class Experience:
    company: str
    industry: str
    end_date: Optional[date]  # None = current
    location: Optional[str] = None


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

def _exact_match(a: Optional[str], b: Optional[str]) -> float:
    if a is None or b is None:
        return 0.0
    return 1.0 if a.strip().lower() == b.strip().lower() else 0.0


def _years_since(d: Optional[date], today: Optional[date] = None) -> float:
    if d is None:
        return 0.0  # current -> 0 years since
    if today is None:
        today = date.today()
    return max(0.0, (today - d).days / 365.25)


def _recency_weight(end_date: Optional[date], half_life_years: float = 7.0, hard_cutoff_years: float = 20.0) -> float:
    """
    Converts recency into a [0,1] weight.
    - hard_cutoff_years: beyond this, weight is ~0
    - half_life_years: exponential decay rate
    """
    years = _years_since(end_date)
    if years >= hard_cutoff_years:
        return 0.0
    # Exponential decay with half-life
    return 0.5 ** (years / half_life_years)


def _experience_similarity(
        a: Iterable[Experience],
        b: Iterable[Experience],
        w_company: float = 0.7,
        w_industry: float = 0.3,
) -> float:
    """
    Compares two sets of experiences using best-match strategy.
    - Company similarity is binary exact match.
    - Industry similarity is binary exact match.
    - Each experience is weighted by recency.
    Output is in [0,1].
    """
    a_list = list(a)
    b_list = list(b)
    if not a_list or not b_list:
        return 0.0

    # For each experience in A, find its best match in B
    total = 0.0
    weight_sum = 0.0
    for exp_a in a_list:
        recency = _recency_weight(exp_a.end_date)
        if recency == 0.0:
            continue

        best = 0.0
        for exp_b in b_list:
            company_sim = _exact_match(exp_a.company, exp_b.company)
            industry_sim = _exact_match(exp_a.industry, exp_b.industry)
            sim = w_company * company_sim + w_industry * industry_sim
            if sim > best:
                best = sim

        total += recency * best
        weight_sum += recency

    return total / weight_sum if weight_sum > 0 else 0.0


# ----------------------------
# Main pairwise similarity
# ----------------------------

def pairwise_similarity(
        u: UserProfile,
        v: UserProfile,
        *,
        # Attribute weights (tune later)
        w_faculty: float = 1.0,
        w_major: float = 1.0,
        w_minor: float = 0.5,
        w_internships: float = 1.0,
        w_jobs: float = 1.0,
        w_location: float = 0.5,
) -> float:
    """
    Weighted Gower-style similarity for mixed attributes.
    Output is in [0,1].
    """
    sims = []
    weights = []

    # Faculty
    sims.append(_exact_match(u.faculty, v.faculty))
    weights.append(w_faculty)

    # Major
    sims.append(_exact_match(u.major, v.major))
    weights.append(w_major)

    # Minor
    sims.append(_exact_match(u.minor, v.minor))
    weights.append(w_minor)

    # Internships
    sims.append(_experience_similarity(u.internships, v.internships))
    weights.append(w_internships)

    # Jobs
    sims.append(_experience_similarity(u.jobs, v.jobs))
    weights.append(w_jobs)

    # Preferred location
    sims.append(_exact_match(u.preferred_location, v.preferred_location))
    weights.append(w_location)

    # Weighted average
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    return sum(s * w for s, w in zip(sims, weights)) / total_weight