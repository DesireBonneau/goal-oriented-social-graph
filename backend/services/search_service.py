import os
import logging
import json
from google import genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        return None
    return genai.Client(api_key=api_key)

def perform_search(query, db, current_user_id=None):
    """
    Search for users in the database using a query.
    1. Tries exact/partial match on name, major, faculty.
    2. If smart search is needed, uses Gemini to interpret intent.
    
    Returns:
        dict: {"nodes": [...], "links": [...]}
    """
    if not query:
        return {"nodes": [], "links": []}

    users_collection = db.users
    
    # 1. Direct Text Search (Regex)
    # We strip and split to allow searching "First Last"
    tokens = query.strip().split()
    regex_pattern = "|".join([os.path.normpath(t) for t in tokens]) # Basic protection
    
    # Construct a flexible Mongo query
    # Matches if any token appears in firstName, lastName, major, or faculty
    mongo_query = {
        "$or": [
            {"firstName": {"$regex": query, "$options": "i"}},
            {"lastName": {"$regex": query, "$options": "i"}},
            {"major": {"$regex": query, "$options": "i"}},
            {"faculty": {"$regex": query, "$options": "i"}},
            # Also check full name reconstruction
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
        logger.info(f"No direct matches for '{query}', attempting Gemini smart search...")
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

def get_suggestions(query, db):
    """
    Returns autocomplete suggestions for a given query.
    Categories: Users, Majors, Faculties.
    """
    if not query or len(query.strip()) < 2:
        return []

    query = query.strip()
    query_lower = query.lower()
    suggestions = []
    
    # 1. Search Users (Limit 3)
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
        suggestions.append({
            "type": "user",
            "label": name,
            "id": str(u['_id']),
            "subtext": u.get('major') or u.get('faculty') or "Student"
        })

    # 2. Search Faculties (Limit 2)
    for f in FACULTIES:
        if query_lower in f.lower():
            suggestions.append({
                "type": "faculty",
                "label": f,
                "id": f
            })
            if len([s for s in suggestions if s['type'] == 'faculty']) >= 2:
                break
                
    # 3. Search Majors (Limit 2)
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
