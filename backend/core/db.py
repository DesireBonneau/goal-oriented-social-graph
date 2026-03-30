import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi


def get_db():
    mongo_uri = os.environ.get('MONGO_URI')
    if not mongo_uri:
        raise ValueError("No MONGO_URI found in environment variables. Please check your .env file.")
        
    client = MongoClient(mongo_uri, server_api=ServerApi('1'))

    # Send a ping to confirm a successful connection
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        print(e)

    
    # Check if a specific database is defined directly in .env
    db_name = os.environ.get('MONGO_DB_NAME')
    if db_name:
        return client[db_name]

    # Otherwise, fallback based on FLASK_ENV mode
    flask_env = os.environ.get('FLASK_ENV', 'development')
    if flask_env == 'testing':
        return client['social_graph_test']
    elif flask_env == 'production':
        return client['social_graph_prod']
    
    # Default to development if not specified
    return client['social_graph_dev']

def check_connection():
    """
    Checks the MongoDB connection.
    Returns: (bool, str) - (success, message)
    """
    try:
        mongo_uri = os.environ.get('MONGO_URI')
        if not mongo_uri:
            return False, "MONGO_URI not found"
            
        client = MongoClient(mongo_uri, server_api=ServerApi('1'), serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        return True, "Connected to MongoDB"
    except Exception as e:
        return False, str(e)
