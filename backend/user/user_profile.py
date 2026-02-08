from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Dict, Any

from industry_classifier import get_industry


@dataclass
class UserProfile:
    user_id: str
    faculty: Optional[str] = None
    major: Optional[str] = None
    minor: Optional[str] = None
    preferred_location: Optional[str] = None
    # You can store any other attributes you need in this dict
    extra_attributes: Dict[str, Any] = field(default_factory=dict)

    # Industry starts as None and gets filled in later
    industry: Optional[str] = None

    def update_industry(self) -> None:
        """
        Updates the user's industry based on current attributes.
        The industry is computed by the imported get_industry function.
        """
        self.industry = get_industry(
            faculty=self.faculty,
            major=self.major,
            minor=self.minor,
            preferred_location=self.preferred_location,
            extra_attributes=self.extra_attributes,
        )

