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
        yield client
        # Teardown: Clean up
        db.users.delete_many({})

def test_health_check(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'
    assert response.json['database']['connected'] is True

def test_get_graph(client):
    response = client.get('/api/graph')
    assert response.status_code == 200
    data = response.json
    assert 'nodes' in data
    assert 'links' in data
    assert len(data['nodes']) > 0

def test_search_graph(client):
    response = client.post('/api/search', json={'query': 'Computer Science'})
    assert response.status_code == 200
    data = response.json
    assert 'nodes' in data
    
    # Check if scores are modified (basic check)
    # This assumes the placeholder algo does something
    assert any(n['score'] > 0 for n in data['nodes'])

def test_create_user(client):
    user_data = {
        'email': 'test@example.com',
        'name': 'Test User',
        'major': 'Computer Science',
        'experience': ['Test Corp']
    }
    response = client.post('/api/user', json=user_data)
    assert response.status_code == 201
    assert 'id' in response.json
    
    # Verify in DB
    db = get_db()
    user = db.users.find_one({'email': 'test@example.com'})
    assert user is not None
    assert user['name'] == 'Test User'

def test_update_user(client):
    # First create
    client.post('/api/user', json={'email': 'update@example.com', 'name': 'Original'})
    
    # Then update
    response = client.patch('/api/user', json={'email': 'update@example.com', 'name': 'Updated'})
    assert response.status_code == 200
    
    # Verify
    db = get_db()
    user = db.users.find_one({'email': 'update@example.com'})
    assert user['name'] == 'Updated'
