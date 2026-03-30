import os
import logging
import json
import re
from google import genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", 
    "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", 
    "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
    "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", 
    "for", "with", "about", "against", "between", "into", "through", "during", "before", 
    "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", 
    "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", 
    "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", 
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", 
    "will", "just", "don", "should", "now", "find", "looking", "someone", "knows", "who", "want"
}

SYNONYMS = {
    "tutor": ["tutor", "teach", "teaching", "ta", "assistant", "instructor"],
    "teach": ["tutor", "teach", "teaching", "ta", "assistant", "instructor"],
    "founder": ["founder", "startup", "ceo", "cto", "entrepreneur", "co-founder"],
    "startup": ["founder", "startup", "ceo", "cto", "entrepreneur", "co-founder"],
    "dev": ["developer", "software", "engineering", "programmer", "coder", "front-end", "back-end"],
    "math": ["math", "mathematics", "calculus", "algebra"],
}

# The stats file will live in backend/search_stats.json to track fallback probability
STATS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "search_stats.json")

def load_stats():
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"total_searches": 0, "nlp_successes": 0, "gemini_fallbacks": 0}

def save_stats(stats):
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f)
    except Exception as e:
        logger.error(f"Failed to save search stats: {e}")

def setup_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        return None
    return genai.Client(api_key=api_key)

def perform_search(query, db, current_user_id=None):
    """
    Search for users in the database using a query.
    1. Tries robust NLP match (Stop-words removed, lemmatization) on name, major, faculty, clubs, and experience.
    2. If smart search is needed, uses Gemini to interpret intent.
    
    Returns:
        dict: {"nodes": [...], "links": [...]}
    """
    if not query:
        return {"nodes": [], "links": []}

    users_collection = db.users
    stats = load_stats()
    stats["total_searches"] += 1
    
    # NLP Step 1: Tokenize and clean query
    raw_tokens = re.findall(r'\w+', query.lower())
    clean_tokens = [t for t in raw_tokens if t not in STOP_WORDS]
    
    # NLP Step 2: Expand synonyms (Lemmatization substitute for specific contexts)
    expanded_tokens = set(clean_tokens)
    for t in clean_tokens:
        if t in SYNONYMS:
            expanded_tokens.update(SYNONYMS[t])
            
    # Remove empty tokens
    expanded_tokens = [t for t in expanded_tokens if t.strip()]
    if not expanded_tokens:
        expanded_tokens = raw_tokens # Fallback if they only searched stop words somehow
        
    regex_pattern = "|".join([re.escape(t) for t in expanded_tokens])
    
    # Construct a flexible Mongo query scanning all relevant fields with our expanded NLP tokens
    mongo_query = {
        "$or": [
            {"firstName": {"$regex": regex_pattern, "$options": "i"}},
            {"lastName": {"$regex": regex_pattern, "$options": "i"}},
            {"major": {"$regex": regex_pattern, "$options": "i"}},
            {"faculty": {"$regex": regex_pattern, "$options": "i"}},
            {"clubs": {"$regex": regex_pattern, "$options": "i"}},
            {"experience.position": {"$regex": regex_pattern, "$options": "i"}},
            {"experience.company": {"$regex": regex_pattern, "$options": "i"}},
            {"$expr": {
                "$regexMatch": {
                    "input": {"$concat": ["$firstName", " ", "$lastName"]},
                    "regex": query,
                    "options": "i"
                }
            }}
        ]
    }
    
    results = list(users_collection.find(mongo_query))
    
    # 2. Fallback to Gemini Smart Search if few results
    is_smart_search = False
    if len(results) == 0:
        stats["gemini_fallbacks"] += 1
        logger.info(f"No local NLP matches for '{query}', deciding on Gemini fallback...")
        # Prevent Gemini execution if we are in local development testing mode
        if os.environ.get('FLASK_ENV') == 'development':
            logger.warning("Bypassing actual Gemini API call because FLASK_ENV=development. Returning empty for test.")
            smart_criteria = None
        else:
            smart_criteria = _get_gemini_search_criteria(query)
        
        if smart_criteria:
            is_smart_search = True
            # Construct a new query based on Gemini's understanding
            gemini_query = {"$or": []}
            
            if smart_criteria.get("major"):
                gemini_query["$or"].append({"major": {"$regex": smart_criteria["major"], "$options": "i"}})
            if smart_criteria.get("faculty"):
                gemini_query["$or"].append({"faculty": {"$regex": smart_criteria["faculty"], "$options": "i"}})
            if smart_criteria.get("interests"):
                # Search in experience or clubs if interests are inferred
                for interest in smart_criteria["interests"]:
                    gemini_query["$or"].append({"clubs": {"$regex": interest, "$options": "i"}})
                    gemini_query["$or"].append({"experience.position": {"$regex": interest, "$options": "i"}})
            
            if gemini_query["$or"]:
                results = list(users_collection.find(gemini_query))
    else:
        stats["nlp_successes"] += 1
        
    save_stats(stats)

    # 3. Format Results for Frontend Graph
    nodes = []
    for u in results:
        user_id = str(u['_id'])
        
        # Calculate a relevance score
        # For now, 1.0 if direct match, 0.7 if smart match
        score = 0.7 if is_smart_search else 1.0
        
        nodes.append({
            "id": user_id,
            "email": u.get('email'),
            "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or "Unknown",
            "val": 10 if score > 0.8 else 5, # Size of node
            "score": score,
            
            # Pass through all other fields for the sidebar
            "firstName": u.get('firstName'),
            "lastName": u.get('lastName'),
            "major": u.get('major'),
            "minor": u.get('minor'),
            "faculty": u.get('faculty'),
            "graduationYear": u.get('graduationYear'),
            "clubs": u.get('clubs', []),
            "experience": u.get('experience', []),
            "socials": u.get('socials', {}),
        })

    return {"nodes": nodes, "links": []}

def _get_gemini_search_criteria(query):
    """
    Uses Gemini to extract structured search criteria from a natural language query.
    """
    client = setup_gemini()
    if not client:
        return None

    prompt = f"""
    You are a search query parser for a university social graph.
    The user is searching for people.
    
    User Query: "{query}"
    
    Extract the intended major, faculty, or generic interests/keywords.
    JSON Format:
    {{
        "major": "Computer Science"Or null,
        "faculty": "Science" or null,
        "interests": ["Python", "AI", "Machine Learning"] or empty list
    }}
    
    Example: "Find me biology students who like chess"
    -> {{"major": "Biology", "faculty": "Science", "interests": ["Chess"]}}
    
    Return ONLY JSON.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"Gemini search parsing failed: {e}")
        return None

# Pre-load data for suggestions
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data') # backend/../data ? No, backend is in root/backend. __file__ is backend/services/search_service.py.
# dirname serves -> backend/services. dirname -> backend. dirname -> root. 
# So DATA_DIR = root/data
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT_DIR, 'data')

def _load_json_data(filename, key):
    try:
        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f).get(key, [])
    except Exception as e:
        logger.error(f"Failed to load {filename}: {e}")
        return []

MAJORS = _load_json_data('majors.json', 'majors')
FACULTIES = _load_json_data('faculties.json', 'faculties')
MINORS = _load_json_data('minors.json', 'minors')

def _get_matched_experience(user_doc, query_tokens):
    """Returns a list of experience entries that match any search token."""
    matched = []
    for exp in user_doc.get('experience', []):
        text = ""
        if isinstance(exp, dict):
            text = f"{exp.get('position', '')} {exp.get('company', '')} {exp.get('dates', '')}".lower()
        elif isinstance(exp, str):
            text = exp.lower()
        if any(t in text for t in query_tokens):
            matched.append(exp)
    return matched


def get_suggestions(query, db):
    """
    Returns autocomplete suggestions for a given query.
    Categories: Users, Majors, Faculties.
    Enriches user results with score, matched_fields, and matched_experience.
    """
    if not query or len(query.strip()) < 2:
        return []

    query = query.strip()
    query_lower = query.lower()
    suggestions = []

    # Tokenize query for matching
    raw_tokens = re.findall(r'\w+', query_lower)
    clean_tokens = [t for t in raw_tokens if t not in STOP_WORDS]
    expanded_tokens = set(clean_tokens)
    for t in clean_tokens:
        if t in SYNONYMS:
            expanded_tokens.update(SYNONYMS[t])
    expanded_tokens = list(expanded_tokens) if expanded_tokens else raw_tokens
    is_keyword_search = bool(expanded_tokens)  # True if meaningful tokens remain after stop word removal

    # 1. Search Users by name (Limit 3)
    users_cursor = db.users.find({
        "$or": [
            {"firstName": {"$regex": query, "$options": "i"}},
            {"lastName": {"$regex": query, "$options": "i"}},
            {"$expr": {
                "$regexMatch": {
                    "input": {"$concat": ["$firstName", " ", "$lastName"]},
                    "regex": query,
                    "options": "i"
                }
            }}
        ]
    }).limit(3)

    for u in users_cursor:
        name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()
        matched_experience = _get_matched_experience(u, expanded_tokens)
        suggestions.append({
            "type": "user",
            "label": name,
            "id": str(u['_id']),
            "subtext": u.get('major') or u.get('faculty') or "Student",
            "score": None,  # No pairwise score without current user context
            "search_type": "name",
            "matched_experience": matched_experience,
            "matched_fields": ["name"],
            # Full profile data for sidebar
            "profile": {
                "major": u.get('major'),
                "faculty": u.get('faculty'),
                "graduationYear": u.get('graduationYear'),
                "clubs": u.get('clubs', []),
                "experience": u.get('experience', []),
                "socials": u.get('socials', {}),
            }
        })

    # 2. Keyword-based user search (experience/major/clubs matching)
    if is_keyword_search:
        regex_pattern = "|".join([re.escape(t) for t in expanded_tokens])
        keyword_cursor = db.users.find({
            "$or": [
                {"major": {"$regex": regex_pattern, "$options": "i"}},
                {"faculty": {"$regex": regex_pattern, "$options": "i"}},
                {"clubs": {"$regex": regex_pattern, "$options": "i"}},
                {"experience.position": {"$regex": regex_pattern, "$options": "i"}},
                {"experience.company": {"$regex": regex_pattern, "$options": "i"}},
            ]
        }).limit(5)

        existing_ids = {s['id'] for s in suggestions if s['type'] == 'user'}
        for u in keyword_cursor:
            uid = str(u['_id'])
            if uid in existing_ids:
                continue
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()
            matched_experience = _get_matched_experience(u, expanded_tokens)

            # Determine which non-experience fields matched
            matched_fields = []
            text_fields = {
                "major": u.get('major', ''),
                "faculty": u.get('faculty', ''),
            }
            for field, val in text_fields.items():
                if val and any(t in val.lower() for t in expanded_tokens):
                    matched_fields.append(field)
            clubs = u.get('clubs', [])
            if isinstance(clubs, list) and any(any(t in c.lower() for t in expanded_tokens) for c in clubs):
                matched_fields.append('clubs')
            if matched_experience:
                matched_fields.append('experience')

            suggestions.append({
                "type": "user",
                "label": name,
                "id": uid,
                "subtext": u.get('major') or u.get('faculty') or "Student",
                "score": None,
                "search_type": "keyword",
                "matched_experience": matched_experience,
                "matched_fields": matched_fields,
                "profile": {
                    "major": u.get('major'),
                    "faculty": u.get('faculty'),
                    "graduationYear": u.get('graduationYear'),
                    "clubs": u.get('clubs', []),
                    "experience": u.get('experience', []),
                    "socials": u.get('socials', {}),
                }
            })

    # 3. Search Faculties (Limit 2)
    for f in FACULTIES:
        if query_lower in f.lower():
            suggestions.append({
                "type": "faculty",
                "label": f,
                "id": f
            })
            if len([s for s in suggestions if s['type'] == 'faculty']) >= 2:
                break

    # 4. Search Majors (Limit 2)
    for m in MAJORS:
        if query_lower in m.lower():
            suggestions.append({
                "type": "major",
                "label": m,
                "id": m
            })
            if len([s for s in suggestions if s['type'] == 'major']) >= 2:
                break

    return suggestions


def get_profile_similarity(user_id_a, user_id_b, db):
    """
    Computes pairwise similarity between two users by ID.
    Returns a dict with score and a breakdown of which fields contributed.
    """
    from bson import ObjectId
    from graph.pairwise_node_similarity import (
        pairwise_similarity_from_mongo_docs,
        _exact_match, _normalize_major_minor, _as_set, _jaccard
    )

    try:
        u = db.users.find_one({"_id": ObjectId(user_id_a)})
        v = db.users.find_one({"_id": ObjectId(user_id_b)})
    except Exception as e:
        logger.error(f"Invalid user IDs for similarity: {e}")
        return {"score": 0.0, "breakdown": []}

    if not u or not v:
        return {"score": 0.0, "breakdown": []}

    score = pairwise_similarity_from_mongo_docs(u, v)

    # Build a human-readable breakdown
    breakdown = []

    faculty_sim = _exact_match(u.get('faculty'), v.get('faculty'))
    if faculty_sim > 0:
        breakdown.append({"field": "Faculty", "detail": u.get('faculty', ''), "match": True})

    major_sim = _exact_match(_normalize_major_minor(u.get('major')), _normalize_major_minor(v.get('major')))
    if major_sim > 0:
        breakdown.append({"field": "Major", "detail": u.get('major', ''), "match": True})
    elif u.get('major') or v.get('major'):
        breakdown.append({"field": "Major", "detail": f"{u.get('major','?')} vs {v.get('major','?')}", "match": False})

    minor_sim = _exact_match(_normalize_major_minor(u.get('minor')), _normalize_major_minor(v.get('minor')))
    if minor_sim > 0 and u.get('minor'):
        breakdown.append({"field": "Minor", "detail": u.get('minor', ''), "match": True})

    # Clubs overlap
    clubs_a = _as_set(u.get('clubs', []))
    clubs_b = _as_set(v.get('clubs', []))
    if clubs_a and clubs_b:
        shared_clubs = clubs_a & clubs_b
        if shared_clubs:
            breakdown.append({"field": "Clubs", "detail": ", ".join(sorted(shared_clubs)), "match": True})

    return {
        "score": round(score, 4),
        "breakdown": breakdown,
        "users": [
            {"id": user_id_a, "name": f"{u.get('firstName','')} {u.get('lastName','')}".strip()},
            {"id": user_id_b, "name": f"{v.get('firstName','')} {v.get('lastName','')}".strip()},
        ]
    }
