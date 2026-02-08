from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Dict, Any, List, Iterable
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


def _decay_score(end_date: Optional[date], *, half_life_months: int = 24) -> float:
    """
    Exponential decay: score = 0.5^(months / half_life_months).
    If no end_date is provided, treat as current (score = 1.0).
    """
    if end_date is None:
        return 1.0
    months = max(0, _months_between(end_date, date.today()))
    return math.pow(0.5, months / max(1, half_life_months))


@dataclass
class Experience:
    company: str
    start_date: Optional[str] = None  # "YYYY-MM" or "YYYY-MM-DD"
    end_date: Optional[str] = None    # "YYYY-MM" or "YYYY-MM-DD"
    location: Optional[str] = None
    role: Optional[str] = None
    industry: Optional[List[tuple[str, float]]] = None


    def update_industry(self) -> None:
        """
        Fills the industry field using get_industry(position, company).
        """
        position = self.role or ""
        self.industry = get_industry(position=position, company=self.company)


    def to_dict(self) -> Dict[str, Any]:
        end_dt = _parse_date(self.end_date)
        return {
            "company": self.company,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "location": self.location,
            "role": self.role,
            "industry": self.industry,
            "decay_score": _decay_score(end_dt),
        }


@dataclass
class UserProfile:
    user_id: str
    faculty: Optional[str] = None
    major: Optional[str] = None
    minor: Optional[str] = None
    preferred_place_of_work: Optional[str] = None

    internships: List[Experience] = field(default_factory=list)
    work_experiences: List[Experience] = field(default_factory=list)

    # You can store any other attributes you need in this dict
    extra_attributes: Dict[str, Any] = field(default_factory=dict)


    def update_industries(self) -> None:
        """
        Updates industry for all internships and work experiences.
        """
        for exp in self._all_experiences():
            exp.update_industry()


    def to_mongo_document(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "faculty": self.faculty,
            "major": self.major,
            "minor": self.minor,
            "preferred_place_of_work": self.preferred_place_of_work,
            "internships": [exp.to_dict() for exp in self.internships],
            "work_experiences": [exp.to_dict() for exp in self.work_experiences],
            "extra_attributes": self.extra_attributes,
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
        Updates this user in MongoDB by user_id with provided fields.
        """
        client, collection = self._get_mongo_collection()
        try:
            collection.update_one({"user_id": self.user_id}, {"$set": new_values})
        finally:
            client.close()


    def _all_experiences(self) -> Iterable[Experience]:
        return list(self.internships) + list(self.work_experiences)

    def _get_mongo_collection(self):
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
        collection_name = os.getenv("MONGO_COLLECTION_NAME")

        if not mongo_uri:
            raise ValueError("Missing MongoDB environment variable: MONGO_URI.")
        if not collection_name:
            raise ValueError("Missing MongoDB environment variable: MONGO_COLLECTION_NAME.")

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