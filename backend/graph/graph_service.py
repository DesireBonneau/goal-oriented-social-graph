"""
Graph service for computing pairwise similarities and managing connections.
Uses pairwise_node_similarity for Extended Gower similarity calculations.
"""

from typing import Dict, List, Any, Optional
from datetime import date
from bson import ObjectId

from .pairwise_node_similarity import pairwise_similarity_from_mongo_docs


def normalize_user_for_similarity(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform MongoDB user document to match the format expected by
    pairwise_similarity_from_mongo_docs.
    
    Maps the 'experience' array (from current schema) to 'internships'/'jobs'.
    """
    normalized = {
        "user_id": str(user_doc.get("_id", "")),
        "faculty": user_doc.get("faculty"),
        "major": user_doc.get("major"),
        "minor": user_doc.get("minor"),
        "preferred_work_country": user_doc.get("preferred_work_country"),
        "internships": [],
        "jobs": [],
        "clubs": user_doc.get("clubs", []),
        "graduation_year": user_doc.get("graduationYear", None),
    }
    
    experience = user_doc.get("experience", [])
    
    for exp in experience:
        # Parse dates from the 'dates' string if possible
        dates_str = exp.get("dates", "")
        position = exp.get("position", "").lower()
        
        # Classify as internship or job based on position
        is_internship = any(keyword in position for keyword in ["intern", "co-op", "fellow", "summer"])
        
        # Build experience entry - read start_date/end_date directly from seeder format
        exp_entry = {
            "company": exp.get("company"),
            "industry": exp.get("industry"),
            "location": exp.get("location"),
            "country": exp.get("country"),
            # Use start_date/end_date fields written by the seeder directly
            "start_date": exp.get("start_date") or _parse_dates_string(exp.get("dates", ""), "start"),
            "end_date": exp.get("end_date") or _parse_dates_string(exp.get("dates", ""), "end"),
            "duration_months": exp.get("duration_months"),
        }
        
        if is_internship:
            normalized["internships"].append(exp_entry)
        else:
            normalized["jobs"].append(exp_entry)
    
    # If no jobs were found, treat all experience as "jobs" for similarity calc
    if not normalized["jobs"] and not normalized["internships"]:
        for exp in experience:
            normalized["jobs"].append({
                "company": exp.get("company"),
                "industry": exp.get("industry"),
                "location": exp.get("location"),
                "country": exp.get("country"),
                "start_date": None,
                "end_date": None,
                "duration_months": None,
            })
    
    return normalized


def _parse_dates_string(dates_str: str, which: str) -> Optional[str]:
    """
    Attempt to parse date info from strings like 'Summer 2023' or '2022-2023'.
    Returns ISO date string or None.
    """
    if not dates_str:
        return None
    
    dates_str = dates_str.lower().strip()
    
    # Handle "present" or "current"
    if which == "end" and ("present" in dates_str or "current" in dates_str):
        return None  # None end_date = current position
    
    # Try to extract year
    import re
    years = re.findall(r'\b(20\d{2})\b', dates_str)
    
    if not years:
        return None
    
    if which == "start":
        year = years[0]
        # If "summer" mentioned, use June
        if "summer" in dates_str:
            return f"{year}-06-01"
        elif "fall" in dates_str:
            return f"{year}-09-01"
        elif "winter" in dates_str or "spring" in dates_str:
            return f"{year}-01-01"
        return f"{year}-01-01"
    else:  # end
        year = years[-1] if len(years) > 1 else years[0]
        if "summer" in dates_str and len(years) == 1:
            return f"{year}-08-31"
        elif "fall" in dates_str:
            return f"{year}-12-31"
        return f"{year}-12-31"


def compute_user_connections(
    db,
    user_id: str,
    threshold: float = 0.10,
    high_similarity_threshold: float = 0.6,
) -> List[Dict[str, Any]]:
    """
    Compute similarity between a single user and ALL other users.
    Creates connection documents for pairs exceeding the threshold.
    
    Args:
        db: MongoDB database instance
        user_id: The ID of the user to compute connections for
        threshold: Minimum similarity score to create a connection (default 0.3)
        high_similarity_threshold: Score above which connection is 'direct' (default 0.7)
    
    Returns:
        List of created connection documents
    """
    users_collection = db.users
    connections_collection = db.connections
    
    # Get the target user
    target_user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        return []
    
    target_normalized = normalize_user_for_similarity(target_user)
    
    # Get all other users
    other_users = users_collection.find({"_id": {"$ne": ObjectId(user_id)}})
    
    new_connections = []
    
    for other_user in other_users:
        other_normalized = normalize_user_for_similarity(other_user)
        
        # Compute similarity
        similarity = pairwise_similarity_from_mongo_docs(target_normalized, other_normalized)
        
        if similarity >= threshold:
            other_id = str(other_user["_id"])
            
            # Determine connection type based on similarity
            connection_type = "direct" if similarity >= high_similarity_threshold else "indirect"
            
            connection = {
                "source": user_id,
                "target": other_id,
                "type": connection_type,
                "strength": round(similarity, 4),
            }
            new_connections.append(connection)
    
    # Insert connections if any
    if new_connections:
        connections_collection.insert_many(new_connections)
    
    return new_connections


def rebuild_all_connections(
    db,
    threshold: float = 0.10,
    high_similarity_threshold: float = 0.6,
) -> Dict[str, Any]:
    """
    Recalculate ALL pairwise similarities and rebuild the entire connections collection.
    
    This is an O(n²) operation - use sparingly for large user bases.
    
    Args:
        db: MongoDB database instance
        threshold: Minimum similarity score to create a connection
        high_similarity_threshold: Score above which connection is 'direct'
    
    Returns:
        Summary dict with counts
    """
    users_collection = db.users
    connections_collection = db.connections
    
    # Clear existing connections
    connections_collection.delete_many({})
    
    # Get all users
    users = list(users_collection.find({}))
    
    if len(users) < 2:
        return {"message": "Not enough users for connections", "connections_created": 0}
    
    # Normalize all users once
    normalized_users = [(str(u["_id"]), normalize_user_for_similarity(u)) for u in users]
    
    new_connections = []
    
    # Compute pairwise similarities (only upper triangle to avoid duplicates)
    for i, (id_a, norm_a) in enumerate(normalized_users):
        for j, (id_b, norm_b) in enumerate(normalized_users):
            if j <= i:
                continue  # Skip self and already-computed pairs
            
            similarity = pairwise_similarity_from_mongo_docs(norm_a, norm_b)
            
            if similarity >= threshold:
                connection_type = "direct" if similarity >= high_similarity_threshold else "indirect"
                
                # Create bidirectional connections
                new_connections.append({
                    "source": id_a,
                    "target": id_b,
                    "type": connection_type,
                    "strength": round(similarity, 4),
                })
                new_connections.append({
                    "source": id_b,
                    "target": id_a,
                    "type": connection_type,
                    "strength": round(similarity, 4),
                })
    
    # Bulk insert
    if new_connections:
        connections_collection.insert_many(new_connections)
    
    return {
        "message": f"Rebuilt connections for {len(users)} users",
        "users_processed": len(users),
        "connections_created": len(new_connections),
    }
