import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from core.db import get_db, check_connection

from graph import compute_user_connections, rebuild_all_connections
from services.cv_service import extract_cv_data
from services.search_service import perform_search, get_suggestions, get_profile_similarity
from core.db_schema import setup_db

from user.user_profile import UserProfile

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
# Allow requests from the frontend URL specified in env
client_url = os.environ.get('CLIENT_URL')
if not client_url:
    raise ValueError("No CLIENT_URL found in environment variables. Please check your .env file.")

CORS(app, resources={r"/api/*": {"origins": client_url}})

# Apply MongoDB schema validation and indexes on startup
try:
    _startup_db = get_db()
    setup_db(_startup_db)
except Exception as _e:
    import logging
    logging.getLogger(__name__).warning(f"DB schema setup failed (non-fatal): {_e}")

@app.route('/health', methods=['GET'])
def health_check():
    db_status, db_message = check_connection()
    status_code = 200 if db_status else 500
    
    return jsonify({
        "status": "healthy" if db_status else "unhealthy",
        "database": {
            "connected": db_status,
            "message": db_message
        }
    }), status_code

import secrets
from functools import wraps


# Helper for Token Auth
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
             return jsonify({"error": "Missing Authorization Header"}), 401
        
        try:
            token = auth_header.split(" ")[1] # Bearer <token>
        except IndexError:
             return jsonify({"error": "Invalid Token Format"}), 401
             
        db = get_db()
        user = db.users.find_one({"token": token})
        
        if not user:
             return jsonify({"error": "Invalid or Expired Token"}), 401
             
        return f(*args, **kwargs)
    return decorated



@app.route('/api/user', methods=['POST'])
def create_user():
    db = get_db()
    data = request.json
    
    # Basic validation
    if not data or 'email' not in data:
        return jsonify({"error": "Email is required"}), 400
    
    # Check for existing user first
    users = db.users
    existing = users.find_one({"email": data['email']})
    
    if existing:
        return jsonify({"message": "User already exists", "id": str(existing['_id'])}), 200

    try:
        # Create user via UserProfile class
        user_obj = UserProfile.create(data)
        
        # Compute connections (using the inserted ID)
        # We need to fetch the ID. UserProfile.create inserts but doesn't store _id on the object unless we updated it.
        # But we can query by email or modify create to return ID.
        # For now, let's query.
        inserted_user = users.find_one({"email": user_obj.email})
        if not inserted_user:
             raise Exception("User creation failed - could not retrieve new user")
        user_id = str(inserted_user['_id'])
        
        try:
            connections = compute_user_connections(db, user_id)
        except Exception as e:
            print(f"Warning: Failed to compute connections for new user: {e}")
            connections = []
            
        # Return standard response
        response = user_obj.to_api_response()
        response['id'] = user_id
        return jsonify({"message": "User created", **response}), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create user: {str(e)}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    db = get_db()
    data = request.json
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required"}), 400
        
    users = db.users
    user = users.find_one({"email": data['email']})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Handle legacy users or partial registrations
    if 'password' not in user:
        return jsonify({"error": "User has no password set. Please register again."}), 401
        
    if not check_password_hash(user['password'], data['password']):
        return jsonify({"error": "Invalid password"}), 401
        
    # Generate/Update Token on Login
    token = secrets.token_hex(16)
    users.update_one({"_id": user['_id']}, {"$set": {"token": token}})
    
    # Build response with 'id' (not '_id') for frontend compatibility
    user_response = {
        "id": str(user['_id']),
        "email": user.get('email'),
        "firstName": user.get('firstName'),
        "lastName": user.get('lastName'),
        "major": user.get('major'),
        "minor": user.get('minor'),
        "faculty": user.get('faculty'),
        "graduationYear": user.get('graduationYear'),
        "clubs": user.get('clubs', []),
        "experience": user.get('experience', []),
        "socials": user.get('socials', {}),
        "token": token
    }
        
    return jsonify(user_response), 200

@app.route('/api/graph/rebuild', methods=['POST'])
def rebuild_graph():
    """Rebuild all connections using smart similarity algorithm."""
    db = get_db()
    try:
        result = rebuild_all_connections(db)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user', methods=['PATCH'])
@require_auth
def update_user():
    db = get_db()
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required for update"}), 400
        
    users = db.users
    
    # Security check: Ensure token matches the user being updated
    auth_header = request.headers.get('Authorization')
    if not auth_header:
         return jsonify({"error": "Missing Authorization Header"}), 401
    token = auth_header.split(" ")[1]
    requester = users.find_one({"token": token})
    
    if not requester or requester['email'] != email:
         return jsonify({"error": "Unauthorized: You can only modify your own profile"}), 403

    result = users.update_one({"email": email}, {"$set": data})
    
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({"message": "User updated"}), 200

@app.route('/api/cv/extract', methods=['POST'])
def extract_cv():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    try:
        # Pass the file stream directly to the service
        extracted_data = extract_cv_data(file.stream)
        if "error" in extracted_data:
            return jsonify(extracted_data), 500
        return jsonify(extracted_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/graph', methods=['GET'])
def get_graph():
    db = get_db()
    
    # Fetch all users
    users_cursor = db.users.find({})
    nodes = []
    for u in users_cursor:
        user_id = str(u['_id'])
        # Transform DB user to Node format
        # Note: isFuzzy, isConnected, summary are computed by frontend based on connections
        nodes.append({
            "id": user_id,
            "email": u.get('email'),
            "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or "Unknown",
            "firstName": u.get('firstName'),
            "lastName": u.get('lastName'),
            "major": u.get('major'),
            "minor": u.get('minor'),
            "faculty": u.get('faculty'),
            "graduationYear": u.get('graduationYear'),
            "clubs": u.get('clubs', []),
            "experience": u.get('experience', []),
            "socials": u.get('socials', {}),
            "val": 5,
            "score": 0.7
        })

    # Fetch connections
    # Note: 'connections' collection might not exist yet if not seeded
    links = []
    if 'connections' in db.list_collection_names():
        connections_cursor = db.connections.find({})
        for c in connections_cursor:
            links.append({
                "source": c['source'],
                "target": c['target'],
                "type": c.get('type', 'direct'),
                "strength": c.get('strength', 0.5)
            })

    return jsonify({"nodes": nodes, "links": links})

@app.route('/api/search', methods=['POST'])
def search_graph():
    db = get_db()
    data = request.json
    if not data:
         # Handle empty body case
         data = {}
    query = data.get('query', '')
    
    # Identify current user for personalized relevance scoring
    current_user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(" ")[1]
            current_user = db.users.find_one({"token": token})
            if current_user:
                current_user_id = str(current_user['_id'])
        except:
            pass  # Unauthenticated search is OK, just not personalized
    
    # Run search via independent service
    # This returns {"nodes": [...], "links": []} based on real DB data
    # Fallback to Gemini happens inside the service if needed
    search_results = perform_search(query, db, current_user_id)
    
    return jsonify(search_results)

@app.route('/api/search/suggestions', methods=['GET'])
def search_suggestions():
    db = get_db()
    query = request.args.get('query', '')
    
    suggestions = get_suggestions(query, db)
    return jsonify(suggestions)

@app.route('/api/similarity', methods=['GET'])
def get_similarity():
    """Compute pairwise similarity score and breakdown between two user IDs."""
    db = get_db()
    user_a = request.args.get('user_a')
    user_b = request.args.get('user_b')

    if not user_a or not user_b:
        return jsonify({"error": "user_a and user_b query params required"}), 400

    result = get_profile_similarity(user_a, user_b, db)
    return jsonify(result)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
