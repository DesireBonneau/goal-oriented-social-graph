import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from db import get_db, check_connection
from algorithm import calculate_similarity, generate_mock_graph_data
from services.cv_service import extract_cv_data

# Load environment variables
# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure CORS
# Allow requests from the frontend URL specified in env
client_url = os.environ.get('CLIENT_URL')
if not client_url:
    raise ValueError("No CLIENT_URL found in environment variables. Please check your .env file.")

CORS(app, resources={r"/api/*": {"origins": client_url}})

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

@app.route('/api/user', methods=['POST'])
def create_user():
    db = get_db()
    data = request.json
    
    # Basic validation
    if not data or 'email' not in data:
        return jsonify({"error": "Email is required"}), 400
    
    # Extended validation could go here, but we trust the schema for now
    # The frontend is responsible for sending the correct structure
    # We just ensure email is unique and valid (backend check)
    if not data['email'].endswith('@mail.mcgill.ca') and not data['email'].endswith('@mcgill.ca'):
         return jsonify({"error": "Must be a McGill email"}), 400
        
    users = db.users
    existing = users.find_one({"email": data['email']})
    
    if existing:
        return jsonify({"message": "User already exists", "id": str(existing['_id'])}), 200
        
    result = users.insert_one(data)
    return jsonify({"message": "User created", "id": str(result.inserted_id)}), 201

@app.route('/api/user', methods=['PATCH'])
def update_user():
    db = get_db()
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required for update"}), 400
        
    users = db.users
    result = users.update_one({"email": email}, {"$set": data})
    
    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({"message": "User updated"}), 200

@app.route('/api/graph', methods=['GET'])
def get_graph():
    # In a real scenario, we might fetch from DB. 
    # For now, we generate the mock graph structure on the fly 
    # but we could augment it with real user data if needed.
    graph_data = generate_mock_graph_data()
    return jsonify(graph_data)

@app.route('/api/search', methods=['POST'])
def search_graph():
    data = request.json
    query = data.get('query', '')
    
    # Get current graph state (or re-generate/fetch)
    # Ideally, we'd pass the current user's context too
    graph = generate_mock_graph_data()
    
    # Run algorithm
    updated_graph = calculate_similarity(query, graph)
    
    return jsonify(updated_graph)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port)
