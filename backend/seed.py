import random
from db import get_db
from algorithm import MAJORS, COMPANIES, FIRST_NAMES, LAST_NAMES, generate_name

def seed_database(num_users=40):
    db = get_db()
    users_collection = db.users
    connections_collection = db.connections

    # Clear existing data (optional, maybe safe for dev)
    # users_collection.delete_many({})
    # connections_collection.delete_many({})
    
    # Check if DB is already populated to avoid duplicates on repeated calls if we don't clear
    if users_collection.count_documents({}) > 0:
        return {"message": "Database already populated. Skipping seed."}

    created_users = []
    
    # 1. Create Users
    for i in range(num_users):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        email = f"{first_name.lower()}.{last_name.lower()}{i}@mail.mcgill.ca"
        
        user = {
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "major": random.choice(MAJORS),
            "experience": [
                {"company": random.choice(COMPANIES), "position": "Intern", "dates": "Summer 2023"},
                {"company": random.choice(COMPANIES), "position": "Fellow", "dates": "Summer 2022"}
            ],
            "skills": ["Python", "React", "Data Science"] if i % 2 == 0 else ["Java", "Spring", "System Design"],
            "interests": ["AI", "Hackathons"] if i % 2 == 0 else ["Web Dev", "Open Source"],
            "isGuest": False
        }
        result = users_collection.insert_one(user)
        created_users.append({**user, "_id": result.inserted_id})

    # 2. Create Connections
    # Simple random connections logic
    connections = []
    
    for user in created_users:
        # Connect to 2-5 random other users
        num_connections = random.randint(2, 5)
        targets = random.sample(created_users, num_connections)
        
        for target in targets:
            if target['_id'] == user['_id']:
                continue
                
            # Avoid duplicate connections (checking both directions roughly)
            # For this simple seed, we just insert.
            
            connection = {
                "source": str(user['_id']),
                "target": str(target['_id']),
                "type": "direct" if random.random() > 0.3 else "indirect",
                "strength": random.uniform(0.1, 1.0)
            }
            connections.append(connection)

    if connections:
        connections_collection.insert_many(connections)

    return {"message": f"Seeded {len(created_users)} users and {len(connections)} connections."}
