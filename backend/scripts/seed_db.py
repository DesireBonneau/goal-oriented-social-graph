"""
seed_db.py — Development Seeder
================================
Populates the database with 100 realistic McGill student profiles.

Usage (from the backend/ directory with venv active):
    python scripts/seed_db.py              # adds 100 users + recomputes connections
    python scripts/seed_db.py --clear      # wipes users+connections first, then seeds
    python scripts/seed_db.py --count 50   # seed a custom number of users

Reads from /data/: majors.json, minors.json, faculties.json, degree_rules.json
"""

import argparse
import json
import os
import random
import secrets
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from werkzeug.security import generate_password_hash

# ── Path setup ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]   # goal-oriented-social-graph/
DATA = ROOT / "data"
BACKEND = ROOT / "backend"

# Load environment variables from backend/.env
load_dotenv(BACKEND / ".env")

# ── Data files ────────────────────────────────────────────────────────────────
def _load(filename: str) -> dict:
    with open(DATA / filename, encoding="utf-8") as f:
        return json.load(f)

FACULTIES_DATA   = _load("faculties.json")["faculties"]
MAJORS_DATA      = _load("majors.json")["majors"]
MINORS_DATA      = _load("minors.json")["minors"]
DEGREE_RULES     = _load("degree_rules.json")["faculties"]

# ── Name pools ────────────────────────────────────────────────────────────────
FIRST_NAMES = [
    "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Lucas", "Sophia",
    "Oliver", "Isabella", "Elijah", "Mia", "Aiden", "Charlotte", "William",
    "Amelia", "Benjamin", "Harper", "Mason", "Evelyn", "Ethan", "Abigail",
    "Michael", "Emily", "Alexander", "Elizabeth", "Daniel", "Mila", "Sebastian",
    "Ella", "Matthew", "Avery", "Jack", "Sofia", "Logan", "Camila", "Owen",
    "Aria", "Samuel", "Scarlett", "Henry", "Victoria", "Dylan", "Madison",
    "Chloe", "Nadia", "Felix", "Leila", "Rafael", "Priya", "Soren", "Aisha",
    "Mateo", "Yuna", "Julian", "Ingrid", "Ibrahim", "Mei", "Luca", "Fatima",
    "Kieran", "Zara", "Theo", "Hana", "Nico", "Simone", "Axel", "Layla",
    "Antoine", "Nina", "Tristan", "Ling", "Hugo", "Amara", "Finn", "Elif",
    "Remy", "Diya", "Kai", "Sara", "Orion", "Jade", "Miles", "Carmen",
    "Callum", "Bianca", "Jasper", "Yuki", "Rowan", "Ananya", "Leon", "Maris",
    "Xavier", "Clara", "Adrian", "Rosa", "Evan", "Lydia"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore",
    "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez",
    "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall",
    "Young", "Allen", "Sanchez", "Wright", "King", "Scott", "Green",
    "Baker", "Adams", "Nelson", "Carter", "Mitchell", "Pereira", "Dubois",
    "Tremblay", "Roy", "Côté", "Gagnon", "Bouchard", "Morin", "Lavoie",
    "Gauthier", "Bergeron", "Fortin", "Simard", "Rousseau", "Leblanc",
    "Chen", "Wang", "Liu", "Zhang", "Park", "Kim", "Tanaka", "Yamamoto",
    "Nguyen", "Pham", "Tran", "Singh", "Patel", "Kumar", "Sharma",
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer",
    "Andersen", "Larsen", "Hansen", "Nielsen", "Svensson", "Johansson",
    "Rossi", "Ferrari", "Russo", "Romano", "Colombo", "Ricci",
    "Cohen", "Levi", "Katz", "Shapiro", "Goldberg", "Klein",
    "Okonkwo", "Diallo", "Mbeki", "Ndiaye", "Toure", "Kofi"
]

# Faculty → relevant (positions, companies) pairs
# 85% of generated experience will draw from this; 15% is random (any faculty)
FACULTY_EXPERIENCE = {
    "Faculty of Engineering": {
        "positions": [
            "Software Engineering Intern", "Backend Developer Intern",
            "Frontend Developer Intern", "Full-Stack Developer Intern",
            "Systems Engineer Intern", "DevOps Intern", "Embedded Systems Intern",
            "Hardware Engineering Intern", "Data Analytics Intern", "AI/ML Intern",
            "Computer Vision Intern", "Network Engineer Intern",
        ],
        "companies": [
            "Google", "Microsoft", "Amazon", "Apple", "Meta", "Shopify",
            "Ubisoft", "CGI Group", "Bombardier", "SNC-Lavalin",
            "Lightspeed", "Coveo", "Element AI", "Ericsson", "Qualcomm",
        ],
    },
    "Faculty of Science": {
        "positions": [
            "Research Assistant", "Lab Technician", "Data Science Intern",
            "Bioinformatics Intern", "Clinical Research Assistant",
            "Machine Learning Research Assistant", "Statistical Analyst Intern",
            "Computational Biology Intern", "Environmental Analyst Intern",
        ],
        "companies": [
            "McGill University Health Centre", "Montreal Neurological Institute",
            "Hospital for Sick Children", "Pfizer", "Johnson & Johnson",
            "Statistics Canada", "McGill Research Centre",
            "National Research Council Canada", "Génome Québec", "Merck",
        ],
    },
    "Desautels Faculty of Management": {
        "positions": [
            "Business Analyst Intern", "Financial Analyst Intern",
            "Investment Banking Intern", "Corporate Finance Intern",
            "Equity Research Intern", "Management Consulting Intern",
            "Marketing Coordinator Intern", "Operations Intern",
            "Strategy Intern", "Human Resources Intern",
        ],
        "companies": [
            "McKinsey", "Deloitte", "KPMG", "J.P. Morgan", "Goldman Sachs",
            "Morgan Stanley", "RBC", "TD Bank", "BMO", "National Bank",
            "Intact Financial", "Bain & Company", "Boston Consulting Group",
        ],
    },
    "Faculty of Arts": {
        "positions": [
            "Research Assistant", "Communications Intern", "Policy Research Intern",
            "Content Writer Intern", "Social Media Coordinator Intern",
            "Teaching Assistant", "Editorial Intern", "Public Affairs Intern",
            "Program Coordinator Intern", "Translation Intern",
        ],
        "companies": [
            "Government of Canada", "Revenue Quebec", "National Film Board",
            "CBC/Radio-Canada", "Amnesty International", "UN Association Canada",
            "McGill University", "Concordia University", "Montreal Museums",
            "Journal de Montréal", "Le Devoir",
        ],
    },
    "Faculty of Agricultural and Environmental Sciences": {
        "positions": [
            "Environmental Consultant Intern", "Sustainability Analyst Intern",
            "Agricultural Research Assistant", "Food Science Intern",
            "Environmental Impact Analyst Intern", "GIS Analyst Intern",
            "Wildlife Biologist Assistant", "Soil Scientist Intern",
        ],
        "companies": [
            "Hydro-Québec", "Environment and Climate Change Canada",
            "Agriculture and Agri-Food Canada", "WWF Canada",
            "SNC-Lavalin Environmental", "Tetra Tech", "Stantec",
            "McCain Foods", "Saputo", "Agropur",
        ],
    },
    "Faculty of Education": {
        "positions": [
            "Teaching Assistant", "Education Program Intern",
            "Curriculum Developer Intern", "After-School Program Coordinator",
            "Tutoring Coordinator", "Special Education Intern",
        ],
        "companies": [
            "McGill University", "Commission Scolaire de Montréal",
            "English Montreal School Board", "YMCA",
            "Boys and Girls Club of Greater Montreal",
        ],
    },
    "Schulich School of Music": {
        "positions": [
            "Music Instructor", "Recording Studio Intern",
            "Event Production Intern", "Arts Administrator Intern",
            "Music Therapist Assistant",
        ],
        "companies": [
            "Cirque du Soleil", "Just For Laughs", "OSM (Orchestre Symphonique de Montréal)",
            "National Film Board", "McGill Music Department",
        ],
    },
    "Faculty of Law": {
        "positions": [
            "Legal Research Intern", "Law Clerk", "Policy Analyst Intern",
            "Articling Student", "Paralegal Intern",
        ],
        "companies": [
            "Norton Rose Fulbright", "McCarthy Tétrault", "Fasken",
            "Department of Justice Canada", "Legal Aid Quebec",
            "Stikeman Elliott", "Blake Cassels & Graydon",
        ],
    },
    "Faculty of Medicine and Health Sciences": {
        "positions": [
            "Clinical Research Assistant", "Medical Scribe",
            "Public Health Intern", "Healthcare Data Analyst Intern",
            "Pharmacy Intern",
        ],
        "companies": [
            "McGill University Health Centre", "Jewish General Hospital",
            "CHU Sainte-Justine", "Health Canada", "Pfizer", "Novartis",
        ],
    },
    "Faculty of Dental Medicine and Oral Health Sciences": {
        "positions": [
            "Dental Assistant Intern", "Oral Health Research Assistant",
            "Dental Clinic Intern",
        ],
        "companies": [
            "McGill Dental Clinic", "Centre Dentaire du Plateau",
            "Faculty Dental Clinic",
        ],
    },
}

# Flat fallback lists for the random 15% or unrecognised faculties
FALLBACK_POSITIONS = [
    "Project Management Intern", "Graphic Design Intern", "UX Design Intern",
    "Data Analytics Intern", "Operations Intern", "Supply Chain Intern",
    "Communications Intern", "Product Manager Intern",
]
FALLBACK_COMPANIES = [
    "Shopify", "Aldo Group", "Aritzia", "Lululemon", "Sid Lee",
    "Videotron", "Bell Canada", "Air Canada", "CN Rail",
]

LOCATIONS = [
    "Montreal, QC", "Toronto, ON", "Vancouver, BC", "Ottawa, ON",
    "New York, NY", "San Francisco, CA", "Seattle, WA", "Boston, MA",
    "London, UK", "Paris, France", "Remote"
]

CLUBS = [
    "McGill Robotics", "CodeMcGill", "McGill AI Society", "McGill Entrepreneurs",
    "McGill Finance Society", "McGill Sustainability Projects",
    "McGill Debating Union", "Model United Nations",
    "McGill Pre-Med Society", "McGill Law Review",
    "McGill Engineering Undergraduate Society", "Sciences Undergraduate Society",
    "McGill Students Consulting for Nonprofit Organizations",
    "McGill Open Source Initiative", "HackMcGill",
    "McGill Data Science Club", "McGill Blockchain",
    "McGill Neuroscience Undergraduate Association",
    "International Student Network", "McGill Music Society",
    "McGill Photography Club", "McGill Film Society",
    "McGill Outdoor Club", "McGill Swim Club",
    "McGill Marketing Association", "McGill Accounting Association",
    "McGill Women in STEM", "McGill First Year Council",
    "McGill Visual Arts Students Alliance", "McGill Environmental Law Society"
]

PREFERRED_LOCATIONS = [
    "Montreal, QC", "Toronto, ON", "Vancouver, BC", "New York, NY",
    "San Francisco, CA", "Remote", "London, UK", "Paris, France",
    "Ottawa, ON", "Boston, MA", "Seattle, WA", None
]

# ── Faculty → major mapping ────────────────────────────────────────────────────
# Maps faculty names to realistic subsets of majors from majors.json
FACULTY_MAJOR_MAP = {
    "Faculty of Arts": [
        "African Studies", "Anthropology", "Art History", "Canadian Studies",
        "Classics", "Cognitive Science", "Communication Studies",
        "East Asian Studies", "Economics", "English - Cultural Studies",
        "English - Drama and Theatre", "English - Literature",
        "Gender, Sexuality, Feminist, and Social Justice Studies",
        "Geography", "German Studies", "Hispanic Studies", "History",
        "International Development Studies", "Italian Studies", "Jewish Studies",
        "Latin American and Caribbean Studies", "Liberal Arts", "Linguistics",
        "Philosophy", "Political Science", "Psychology", "Religious Studies",
        "Russian", "Social Work", "Sociology",
        "World Islamic and Middle East Studies",
        "Langue et littérature françaises - Études et pratiques littéraires",
        "Langue et littérature françaises - Traduction",
    ],
    "Faculty of Science": [
        "Applied Mathematics", "Atmospheric Science", "Biology",
        "Biology - Cell/Molecular", "Biology - Organismal", "Chemistry",
        "Cognitive Science", "Computer Science", "Earth Sciences and Economics",
        "Environmental Biology", "Geology", "Geography - Physical Geography",
        "Kinesiology", "Life Sciences - Biological and Agricultural",
        "Life Sciences - Multidisciplinary", "Linguistics",
        "Mathematics", "Mathematics and Computer Science",
        "Mathematics and Statistics for Management",
        "Microbiology and Molecular Biotechnology", "Nutrition",
        "Nutrition - Metabolism, Health and Disease",
        "Nutrition - Sports Nutrition", "Physics",
        "Plant Biology", "Psychology", "Statistics",
        "Sustainability, Science and Society",
    ],
    "Faculty of Engineering": [
        "Bioengineering", "Bioresource Engineering", "Chemical Engineering",
        "Civil Engineering", "Computer Engineering", "Electrical Engineering",
        "Global Engineering", "Materials Engineering", "Mechanical Engineering",
        "Mechanical Engineering - Design", "Mining Engineering",
        "Software Engineering",
    ],
    "Desautels Faculty of Management": [
        "Accounting", "Business Analytics", "Economics for Management Students",
        "Finance", "Information Technology Management", "International Management",
        "Managing for Sustainability", "Marketing",
        "Mathematics and Statistics for Management",
        "Organizational Behaviour and Human Resources",
        "Retail Management", "Strategic Management",
    ],
    "Faculty of Agricultural and Environmental Sciences": [
        "Agribusiness", "Agricultural Economics", "Animal Biology",
        "Animal Health and Disease", "Applied Ecology",
        "Environment", "Environment - Atmospheric Environment and Air Quality",
        "Environment - Biodiversity and Conservation",
        "Environment - Ecological Determinants of Health - Cellular",
        "Environment - Food Production and Environment",
        "Environment - Renewable Resource Management",
        "Environment - Water Environments and Ecosystems",
        "Environmental Biology", "Environmental Economics",
        "Field Crops and Horticulture", "Food Science",
        "Global Food Security", "Livestock", "Nutrition",
        "Nutrition - Food Function and Safety", "Nutrition - Global Nutrition",
        "Plant Biology", "Professional Agrology",
        "Soil and Water Resources", "Sustainable Agriculture Systems",
        "Wildlife Biology",
    ],
    "Faculty of Education": [
        "Education in Global Contexts", "Music Education",
        "Physical and Health Education",
    ],
    "Faculty of Law": ["Law"],
    "Faculty of Medicine and Health Sciences": ["Medicine", "Kinesiology", "Nutrition"],
    "Faculty of Dental Medicine and Oral Health Sciences": ["Dentistry"],
    "Schulich School of Music": ["Music", "Music Education"],
    "School of Continuing Studies": ["Liberal Arts"],
    "Graduate and Postdoctoral Studies": [],
}

# ── Degree rule helpers ────────────────────────────────────────────────────────
def _get_rules(faculty: str) -> dict:
    return DEGREE_RULES.get(faculty, {})

def _pick_minor_count(faculty: str) -> int:
    """Return 0, 1, or 2 minors based on the degree rules for the faculty."""
    rules = _get_rules(faculty)
    minor_rules = rules.get("minors", {})
    max_minors = minor_rules.get("max", 1)

    # Professional faculties: almost never have minors
    if faculty in ("Faculty of Law", "Faculty of Medicine and Health Sciences",
                   "Faculty of Dental Medicine and Oral Health Sciences",
                   "School of Continuing Studies", "Graduate and Postdoctoral Studies"):
        return 0

    # Engineering and Commerce: 0 or 1
    if faculty in ("Faculty of Engineering", "Desautels Faculty of Management",
                   "Faculty of Education", "Schulich School of Music"):
        return random.choices([0, 1], weights=[60, 40])[0]

    # Arts and Science: can have 0, 1, or 2
    if max_minors >= 2:
        return random.choices([0, 1, 2], weights=[20, 60, 20])[0]

    return random.choices([0, 1], weights=[40, 60])[0]

def _pick_majors(faculty: str) -> list[str]:
    available = FACULTY_MAJOR_MAP.get(faculty, MAJORS_DATA)
    if not available:
        return [random.choice(MAJORS_DATA)]

    rules = _get_rules(faculty)
    major_rules = rules.get("majors", {})
    max_majors = major_rules.get("max", 1)

    if faculty in ("Faculty of Arts", "Faculty of Science") and max_majors >= 2:
        count = random.choices([1, 2], weights=[70, 30])[0]
    else:
        count = 1

    count = min(count, len(available))
    return random.sample(available, count)

# Faculty → industries mapping for similarity matching
FACULTY_INDUSTRIES = {
    "Faculty of Engineering": ["Technology", "Software", "Engineering", "Hardware"],
    "Faculty of Science": ["Research", "Healthcare", "Biotech", "Data Science"],
    "Desautels Faculty of Management": ["Finance", "Consulting", "Banking", "Marketing"],
    "Faculty of Arts": ["Media", "Government", "Education", "Communications"],
    "Faculty of Agricultural and Environmental Sciences": ["Environment", "Agriculture", "Energy", "Sustainability"],
    "Faculty of Education": ["Education", "Youth Services", "Nonprofit"],
    "Schulich School of Music": ["Entertainment", "Arts", "Media", "Music"],
    "Faculty of Law": ["Legal", "Government", "Policy"],
    "Faculty of Medicine and Health Sciences": ["Healthcare", "Pharma", "Research", "Biotech"],
    "Faculty of Dental Medicine and Oral Health Sciences": ["Healthcare", "Dental", "Research"],
}

FALLBACK_INDUSTRIES = ["Technology", "Consulting", "Retail", "Communications", "Operations"]

# ── Experience generation ─────────────────────────────────────────────────────
def _generate_experience(count: int, faculty: str = "") -> list[dict]:
    faculty_pool = FACULTY_EXPERIENCE.get(faculty, {})
    relevant_positions = faculty_pool.get("positions", FALLBACK_POSITIONS)
    relevant_companies = faculty_pool.get("companies", FALLBACK_COMPANIES)
    faculty_industries = FACULTY_INDUSTRIES.get(faculty, FALLBACK_INDUSTRIES)

    experiences = []
    for _ in range(count):
        start_year = random.randint(2021, 2025)
        start_month = random.randint(1, 12)
        duration_months = random.randint(2, 16)
        end_year = start_year + (start_month + duration_months - 1) // 12
        end_month = (start_month + duration_months - 1) % 12 + 1

        # 85% relevant to faculty, 15% completely random
        use_relevant = random.random() < 0.85
        position = random.choice(relevant_positions if use_relevant else FALLBACK_POSITIONS)
        company  = random.choice(relevant_companies if use_relevant else FALLBACK_COMPANIES)

        # Pick 1-2 industries from the faculty's pool
        num_industries = random.randint(1, min(2, len(faculty_industries)))
        selected_industries = random.sample(
            faculty_industries if use_relevant else FALLBACK_INDUSTRIES,
            num_industries
        )

        experiences.append({
            "position": position,
            "company": company,
            "start_date": f"{start_year}-{start_month:02d}",
            "end_date":   f"{end_year}-{end_month:02d}",
            "location":   random.choice(LOCATIONS),
            "industry": selected_industries,
        })
    return experiences

# ── User generation ───────────────────────────────────────────────────────────
def generate_user(index: int) -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)

    # Filter out faculties that have no majors or are non-standard
    valid_faculties = [f for f in FACULTIES_DATA if FACULTY_MAJOR_MAP.get(f, [1])]
    faculty = random.choice(valid_faculties)

    majors = _pick_majors(faculty)
    primary_major = majors[0]
    second_major = majors[1] if len(majors) > 1 else None

    minor_count = _pick_minor_count(faculty)
    available_minors = [m for m in MINORS_DATA if m not in majors]
    selected_minors = random.sample(available_minors, min(minor_count, len(available_minors)))

    # Minor field: store as a single string (first minor) for schema compat;
    # if 2 minors, store second in clubs or as additional field
    primary_minor = selected_minors[0] if selected_minors else None

    grad_year = random.randint(2024, 2028)
    num_clubs = random.randint(0, 4)
    selected_clubs = random.sample(CLUBS, num_clubs)

    # If the student has a second minor, encode it as a club-tag for now
    # (the schema only has one `minor` field)
    if len(selected_minors) > 1:
        selected_clubs = [f"Minor: {selected_minors[1]}"] + selected_clubs

    num_experiences = random.randint(0, 3)
    experience = _generate_experience(num_experiences, faculty)

    email_formats = [
        f"{first.lower()}.{last.lower()}@mail.mcgill.ca",
        f"{first.lower()[0]}{last.lower()}@mail.mcgill.ca",
        f"{first.lower()}{last.lower()[0]}@mail.mcgill.ca",
        f"{first.lower()}.{last.lower()}{random.randint(1, 99)}@mail.mcgill.ca",
    ]
    email = random.choice(email_formats)

    token = secrets.token_hex(16)
    password_hash = generate_password_hash(f"seedpass{index}")

    doc = {
        "email": email,
        "first_name": first,
        "last_name": last,
        "firstName": first,   # camelCase alias for API compatibility
        "lastName": last,
        "graduation_year": grad_year,
        "graduationYear": grad_year,
        "faculty": faculty,
        "major": primary_major,
        "minor": primary_minor,
        "clubs": selected_clubs,
        "experience": experience,
        "socials": {"linkedinUrl": "", "other": []},
        "friends": [],
        "connectionStrength": [],
        "preferred_work_place": random.choice(PREFERRED_LOCATIONS),
        "password": password_hash,
        "token": token,
        "isGuest": False,
    }

    # Add second major as a note in the document for reference
    if second_major:
        doc["second_major"] = second_major

    return doc

# ── Database helpers ──────────────────────────────────────────────────────────
def get_db():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("ERROR: MONGO_URI not found in environment.")
        sys.exit(1)

    client = MongoClient(mongo_uri, server_api=ServerApi('1'))
    db_name = os.getenv("MONGO_DB_NAME")
    if db_name:
        return client[db_name]
    flask_env = os.getenv("FLASK_ENV", "development")
    if flask_env == "production":
        return client["social_graph_prod"]
    if flask_env == "testing":
        return client["social_graph_test"]
    return client["social_graph_dev"]

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Seed the database with fake McGill users.")
    parser.add_argument("--clear", action="store_true", help="Delete all existing users and connections before seeding.")
    parser.add_argument("--count", type=int, default=100, help="Number of users to generate (default: 100).")
    args = parser.parse_args()

    db = get_db()
    users_col = db[os.getenv("MONGO_USER_COLLECTION", "users")]
    connections_col = db["connections"]

    if args.clear:
        deleted_users = users_col.delete_many({}).deleted_count
        deleted_conns = connections_col.delete_many({}).deleted_count
        print(f"Cleared {deleted_users} users and {deleted_conns} connections.")

    print(f"Generating {args.count} users...")
    generated = []
    emails_used = set()
    attempts = 0
    max_attempts = args.count * 10

    while len(generated) < args.count and attempts < max_attempts:
        attempts += 1
        user = generate_user(len(generated))
        if user["email"] in emails_used:
            continue
        emails_used.add(user["email"])
        generated.append(user)

    # Insert, skipping any that already exist in DB (by email)
    inserted = 0
    skipped = 0
    for user in generated:
        try:
            users_col.insert_one(user)
            inserted += 1
        except Exception:
            skipped += 1

    print(f"Done. Inserted: {inserted} | Skipped (duplicate email): {skipped}")
    print("\nTo rebuild similarity connections, restart the backend with 'node run.js'")
    print("and call POST /api/seed or wait for the graph endpoint to compute them.")

if __name__ == "__main__":
    main()