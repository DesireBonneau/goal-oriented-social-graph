import pytest
import os
from app import app
from db import get_db

@pytest.fixture
def client():
    # Configure app for testing
    os.environ['FLASK_ENV'] = 'testing'
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        # Setup: Clear test DB
        db = get_db()
        db.users.delete_many({})
        db.connections.delete_many({})
        yield client
        # Teardown: Clean up
        db.users.delete_many({})
        db.connections.delete_many({})

def test_health_check(client):
    """Health check should return healthy status with DB connected."""
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'
    assert response.json['database']['connected'] is True

# ============================================
# User Creation Tests
# ============================================

def test_create_user_returns_id_field(client):
    """User creation should return 'id' (not '_id') for frontend compatibility."""
    user_data = {
        'email': 'test@mail.mcgill.ca',
        'password': 'testpass123',
        'firstName': 'Test',
        'lastName': 'User',
        'major': 'Computer Science',
        'faculty': 'Faculty of Science',
        'graduationYear': 2026
    }
    response = client.post('/api/user', json=user_data)
    assert response.status_code == 201
    data = response.json
    
    # Must have 'id' field, not '_id'
    assert 'id' in data, "Response must include 'id' field"
    assert '_id' not in data, "Response must not include '_id' field"
    assert 'token' in data
    
    # Should also return the user data
    assert data['email'] == 'test@mail.mcgill.ca'
    assert data['firstName'] == 'Test'
    assert data['lastName'] == 'User'
    assert data['major'] == 'Computer Science'

def test_create_user_rejects_non_mcgill_email(client):
    """Only McGill emails should be accepted."""
    user_data = {
        'email': 'test@gmail.com',
        'firstName': 'Test',
        'lastName': 'User'
    }
    response = client.post('/api/user', json=user_data)
    assert response.status_code == 400
    assert 'McGill' in response.json.get('error', '')

def test_create_user_with_socials(client):
    """User creation should handle new socials schema."""
    user_data = {
        'email': 'social@mail.mcgill.ca',
        'password': 'testpass123',
        'firstName': 'Social',
        'lastName': 'Test',
        'major': 'Computer Science',
        'socials': {
            'linkedinUrl': 'https://linkedin.com/in/testuser',
            'other': [{'name': 'GitHub', 'url': 'https://github.com/testuser'}]
        }
    }
    response = client.post('/api/user', json=user_data)
    assert response.status_code == 201
    assert 'socials' in response.json

# ============================================
# Login Tests
# ============================================

def test_login_returns_id_field(client):
    """Login should return 'id' (not '_id') for frontend compatibility."""
    # First create user
    user_data = {
        'email': 'login@mail.mcgill.ca',
        'password': 'testpass123',
        'firstName': 'Login',
        'lastName': 'Test',
        'major': 'Physics'
    }
    client.post('/api/user', json=user_data)
    
    # Then login
    response = client.post('/api/login', json={
        'email': 'login@mail.mcgill.ca',
        'password': 'testpass123'
    })
    assert response.status_code == 200
    data = response.json
    
    # Must have 'id' field, not '_id'
    assert 'id' in data, "Response must include 'id' field"
    assert '_id' not in data, "Response must not include '_id' field"
    assert 'token' in data
    assert 'password' not in data, "Password must not be in response"
    
    # Should return user data
    assert data['firstName'] == 'Login'
    assert data['major'] == 'Physics'

def test_login_wrong_password(client):
    """Login with wrong password should fail."""
    client.post('/api/user', json={
        'email': 'wrongpass@mail.mcgill.ca',
        'password': 'correctpass',
        'firstName': 'Test',
        'lastName': 'User'
    })
    
    response = client.post('/api/login', json={
        'email': 'wrongpass@mail.mcgill.ca',
        'password': 'wrongpass'
    })
    assert response.status_code == 401

# ============================================
# Graph Endpoint Tests
# ============================================

def test_graph_returns_required_node_fields(client):
    """Graph endpoint should return user schema fields."""
    # Create a user first
    client.post('/api/user', json={
        'email': 'graph@mail.mcgill.ca',
        'password': 'testpass',
        'firstName': 'Graph',
        'lastName': 'Test',
        'major': 'Computer Science',
        'graduationYear': 2026
    })
    
    response = client.get('/api/graph')
    assert response.status_code == 200
    data = response.json
    
    assert 'nodes' in data
    assert 'links' in data
    assert len(data['nodes']) > 0
    
    # Check user schema fields (not visualization properties)
    node = data['nodes'][0]
    required_fields = ['id', 'name', 'email', 'major', 'experience', 'val', 'score']
    for field in required_fields:
        assert field in node, f"Node must have '{field}' field"

def test_graph_uses_id_not_underscore_id(client):
    """Graph nodes should use 'id', not '_id'."""
    client.post('/api/user', json={
        'email': 'idtest@mail.mcgill.ca',
        'password': 'test',
        'firstName': 'ID',
        'lastName': 'Test'
    })
    
    response = client.get('/api/graph')
    node = response.json['nodes'][0]
    
    assert 'id' in node
    assert '_id' not in node

# ============================================
# Search Tests
# ============================================

def test_search_graph(client):
    """Search should return modified scores."""
    response = client.post('/api/search', json={'query': 'Computer Science'})
    assert response.status_code == 200
    data = response.json
    assert 'nodes' in data
    assert any(n['score'] > 0 for n in data['nodes'])
