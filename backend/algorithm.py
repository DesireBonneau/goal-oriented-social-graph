import random
import math

# Constants ported from frontend config
MAJORS = [
    "Computer Science", "Software Engineering", "Electrical Engineering",
    "Psychology", "Economics", "Mathematics", "Physics", "Cognitive Science"
]

COMPANIES = [
    "Tesla", "Google", "Microsoft", "Amazon", "Shopify",
    "Morgan Stanley", "Ubisoft", "Mila", "CGI"
]

FIRST_NAMES = [
    "Sarah", "Marcus", "Aisha", "David", "Priya", "James", "Mei", "Carlos",
    "Emma", "Jamal", "Sofia", "Ryan", "Fatima", "Kevin", "Olivia", "Andre",
    "Yuki", "Daniel", "Zara", "Michael", "Chloe", "Hassan", "Isabella", "Tyler",
    "Ananya", "Brandon", "Maya", "Ethan", "Layla", "Jason", "Nina", "Derek"
]

LAST_NAMES = [
    "Chen", "Johnson", "Patel", "Williams", "Kim", "Rodriguez", "Singh", "Brown",
    "Nguyen", "Martinez", "Lee", "Thompson", "Garcia", "Wilson", "Ahmed", "Taylor",
    "Wang", "Anderson", "Sharma", "Moore", "Park", "Jackson", "Okonkwo", "White",
    "Tanaka", "Harris", "Gupta", "Martin", "Liu", "Robinson", "Khan", "Clark"
]

def generate_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def random_in_range(min_val, max_val):
    return random.uniform(min_val, max_val)

def generate_mock_graph_data(N=40):
    """
    Generates a realistic graph with nodes and links structured by connection degree.
    Ported from frontend/src/data/mockData.js
    """
    nodes = []
    links = []
    
    # Config
    score_ranges = {
        "firstDegree": (0.85, 0.98),
        "secondDegree": (0.60, 0.84),
        "thirdDegree": (0.10, 0.59)
    }
    
    link_config = {
        "direct": {"strength": 0.8, "type": "direct"},
        "indirect": {"strength": 0.4, "type": "indirect"},
        "fuzzy": {"strength": 0.1, "type": "fuzzy"}
    }

    # Partition nodes
    num_first_degree = min(math.floor(N * 0.15) + 2, 6)
    num_second_degree = math.floor((N - 1 - num_first_degree) * 0.5)
    
    all_ids = [f"user_{i}" for i in range(N)]
    
    first_degree_ids = all_ids[1:1+num_first_degree]
    second_degree_ids = all_ids[1+num_first_degree:1+num_first_degree+num_second_degree]
    third_degree_ids = all_ids[1+num_first_degree+num_second_degree:]
    
    # 1. Main User
    nodes.append({
        "id": "user_0",
        "name": "You",
        "info": {
            "major": random.choice(MAJORS),
            "experience": [
                {"company": random.choice(COMPANIES), "position": "Research Assistant", "dates": "2023-Present"},
                {"company": random.choice(COMPANIES), "position": "Intern", "dates": "Summer 2022"}
            ]
        },
        "val": 10,
        "score": 1.0,
        "isFuzzy": False,
        "isConnected": False,
        "summary": "Student at McGill University"
    })
    
    # 2. First Degree
    for idx, uid in enumerate(first_degree_ids):
        score = random_in_range(*score_ranges["firstDegree"])
        nodes.append({
            "id": uid,
            "name": generate_name(),
            "info": {
                "major": random.choice(MAJORS),
                "experience": [
                    {"company": random.choice(COMPANIES), "position": "Intern", "dates": "Summer 2023"}
                ]
            },
            "val": score * 8 + 2,
            "score": score,
            "isFuzzy": False,
            "isConnected": idx < 3,
            "summary": "Student at McGill University"
        })
        links.append({
            "source": "user_0",
            "target": uid,
            "strength": link_config["direct"]["strength"],
            "type": link_config["direct"]["type"]
        })

    # 3. Second Degree
    shuffled_second = second_degree_ids.copy()
    random.shuffle(shuffled_second)
    for idx, uid in enumerate(shuffled_second):
        score = random_in_range(*score_ranges["secondDegree"])
        nodes.append({
            "id": uid,
            "name": generate_name(),
            "info": {
                "major": random.choice(MAJORS),
                "experience": [
                    {"company": random.choice(COMPANIES), "position": "Co-op", "dates": "Fall 2023"}
                ]
            },
            "val": score * 8 + 2,
            "score": score,
            "isFuzzy": False,
            "isConnected": False,
            "summary": "Student at McGill University"
        })
        # Link to random first degree
        if first_degree_ids:
            parent_idx = idx % len(first_degree_ids)
            links.append({
                "source": first_degree_ids[parent_idx],
                "target": uid,
                "strength": link_config["indirect"]["strength"],
                "type": link_config["indirect"]["type"]
            })

    # 4. Third Degree
    shuffled_third = third_degree_ids.copy()
    random.shuffle(shuffled_third)
    for idx, uid in enumerate(shuffled_third):
        score = random_in_range(*score_ranges["thirdDegree"])
        nodes.append({
            "id": uid,
            "name": generate_name(),
            "info": {
                "major": random.choice(MAJORS),
                "experience": [
                    {"company": random.choice(COMPANIES), "position": "Volunteer", "dates": "2022"}
                ]
            },
            "val": score * 8 + 2,
            "score": score,
            "isFuzzy": True,
            "isConnected": False,
            "summary": "Student at McGill University"
        })
        # Link to random second degree
        if second_degree_ids:
            parent_idx = idx % len(second_degree_ids)
            links.append({
                "source": second_degree_ids[parent_idx],
                "target": uid,
                "strength": link_config["fuzzy"]["strength"],
                "type": link_config["fuzzy"]["type"]
            })
            
    # Helper for cross links
    def add_cross_links(ids, count, config):
        shuffled = ids.copy()
        random.shuffle(shuffled)
        for i in range(min(count, len(shuffled) - 1)):
             links.append({
                "source": shuffled[i],
                "target": shuffled[(i + 1) % len(shuffled)],
                "strength": config["strength"] * 0.7,
                "type": config["type"]
            })
            
    add_cross_links(first_degree_ids, 2, link_config["direct"])
    add_cross_links(second_degree_ids, 4, link_config["indirect"])
    add_cross_links(third_degree_ids, 3, link_config["fuzzy"])

    return {"nodes": nodes, "links": links}

def calculate_similarity(query, graph):
    """
    Placeholder similarity algorithm.
    """
    lower_query = query.lower().strip()
    
    score_ranges = {
        "firstDegree": (0.85, 0.98),
        "secondDegree": (0.60, 0.84),
        "thirdDegree": (0.10, 0.59)
    }
    
    for node in graph['nodes']:
        if node['id'] == 'user_0':
            continue
            
        match_score = 0
        if lower_query == "":
            # Reset
            if node.get('isFuzzy'):
                match_score = random_in_range(*score_ranges["thirdDegree"])
            elif node.get('isConnected'):
                 match_score = random_in_range(*score_ranges["firstDegree"])
            else:
                 match_score = random_in_range(*score_ranges["secondDegree"])
        else:
            # Relevance check
            major_match = lower_query in node['info']['major'].lower()
            name_match = lower_query in node['name'].lower()
            
            # Handle experience as string or object
            exp_match = False
            for e in node['info']['experience']:
                if isinstance(e, str):
                    if lower_query in e.lower():
                        exp_match = True
                        break
                elif isinstance(e, dict):
                    # Check company, position, dates
                    vals = [str(v).lower() for v in e.values()]
                    if any(lower_query in v for v in vals):
                        exp_match = True
                        break
            
            relevant = major_match or name_match or exp_match
            
            if relevant:
                match_score = 0.8 + random.random() * 0.2
            else:
                match_score = 0.1 + random.random() * 0.2
                
        node['score'] = match_score
        node['val'] = match_score * 8 + 2
        
    return graph
