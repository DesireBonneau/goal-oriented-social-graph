from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Dict, Any, List
import math
import os

from industry_classifier import get_industry


def _parse_date(value: Optional[str]) -> Optional[date]:
    """
    Accepts 'YYYY-MM' or 'YYYY-MM-DD'. Returns a date or None.
    """
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.date()
        except ValueError:
            continue
    return None


def _months_between(a: date, b: date) -> int:
    return (b.year - a.year) * 12 + (b.month - a.month)


# For now, the decay is of 5 years
def _decay_score(end_date: Optional[date], *, half_life_months: int = 60) -> float:
    """
    Exponential decay: score = 0.5^(months / half_life_months).
    If no end_date is provided, treat as current (score = 1.0).
    """
    if end_date is None:
        return 1.0
    months = max(0, _months_between(end_date, date.today()))
    return math.pow(0.5, months / max(1, half_life_months))




# Dataclass for the internships and work experiences
@dataclass
class Experience:
    position: str
    company: str
    dates: str
    location: str
    industries: List[str] = field(default_factory=list)

    def update_industries(self) -> None:
        """
        Fills the industries field using get_industry(position, company).
        """
        scored = get_industry(position=self.position, company=self.company) or []
        self.industries = [name for name, _ in scored]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "position": self.position,
            "company": self.company,
            "dates": self.dates,
            "location": self.location,
            "industries": self.industries,
        }


@dataclass
class UserProfile:
    email: str
    first_name: str
    last_name: str
    graduation_year: int
    faculty: str
    major: str
    minor: Optional[str] = None
    clubs: List[str] = field(default_factory=list)
    experience: List[Experience] = field(default_factory=list)
    socials: Dict[str, Any] = field(default_factory=lambda: {"linkedinUrl": "", "other": []})
    # Their emails
    friends: List[str] = field(default_factory=list)
    # Top 50 for Computed Similarity Cache (Implicit Graph)
    connectionStrength: List[Dict[str, Any]] = field(default_factory=list)
    preferred_work_place: Optional[str] = None


    def update_industries(self) -> None:
        """
        Updates industries for all experience entries.
        """
        for exp in self.experience:
            exp.update_industries()


    def to_mongo_document(self) -> Dict[str, Any]:
        return {
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "graduation_year": self.graduation_year,
            "faculty": self.faculty,
            "major": self.major,
            "minor": self.minor,
            "clubs": self.clubs,
            "experience": [exp.to_dict() for exp in self.experience],
            "socials": self.socials,
            "friends": self.friends,
            "connectionStrength": self.connectionStrength, # that should be a dictionary in order of top to lowest
            "preferred_work_place": self.preferred_work_place,
        }


    def add_to_mongodb(self) -> None:
        """
        Inserts this user into MongoDB.
        """
        client, collection = self._get_mongo_collection()
        try:
            collection.insert_one(self.to_mongo_document())
        finally:
            client.close()


    def update_in_mongodb(self, new_values: Dict[str, Any]) -> None:
        """
        Updates this user in MongoDB by email with provided fields.
        """
        client, collection = self._get_mongo_collection()
        try:
            collection.update_one({"email": self.email}, {"$set": new_values})
        finally:
            client.close()


    @staticmethod
    def _get_mongo_collection():
        """
        Expects the following in backend/.env:
          MONGO_URI=<your-uri>
          MONGO_DB_NAME=<your-db> (optional if DB is in URI)
          MONGO_COLLECTION_NAME=<your-collection>
        """
        from pymongo import MongoClient  # local import to avoid hard dependency at import time

        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        _load_env_file(env_path)

        mongo_uri = os.getenv("MONGO_URI")
        db_name = os.getenv("MONGO_DB_NAME")
        collection_name = os.getenv("MONGO_USER_COLLECTION")

        if not mongo_uri:
            raise ValueError("Missing MongoDB environment variable: MONGO_URI.")
        if not collection_name:
            raise ValueError("Missing MongoDB environment variable: MONGO_USER_COLLECTION.")

        client = MongoClient(mongo_uri)

        if db_name:
            db = client[db_name]
        else:
            db = client.get_default_database()
            if db is None:
                raise ValueError("Missing database name: set MONGO_DB_NAME or include DB in MONGO_URI.")

        collection = db[collection_name]
        return client, collection


def _load_env_file(path: str) -> None:
    """
    Minimal .env loader. Reads key=value lines into os.environ if not already set.
    """
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
