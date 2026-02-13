import random
import time
import requests
from user.industry_classifier import get_industry

API_BASE_URL = "http://localhost:5000"
CREATE_USER_URL = f"{API_BASE_URL.rstrip('/')}/api/user"

# --------- YOUR FULL MAJORS LIST (as provided) ----------
MCGILL_FACULTIES= [
    "Arts",
    "Science",
    "Engineering",
    "Medicine and Health Sciences",
    "Desautels Faculty of Management",
    "Education",
    "Law",
    "Agricultural and Environmental Sciences",
    "Dental Medicine and Oral Health Sciences",
    "Schulich School of Music",
    "Graduate and Postdoctoral Studies",
    "School of Continuing Studies",
    "Bieler School of Environment",
    "Interfaculty Studies",
    "Science",
    "Arts",
    "Engineering",
    "Medicine and Health Sciences",
    "Desautels Faculty of Management",
    "Education",
    "Law",
    "Schulich School of Music",
    "Arts",
    "Science",
    "Engineering",
    "Graduate and Postdoctoral Studies",
    "School of Continuing Studies",
    "Agricultural and Environmental Sciences",
    "Bieler School of Environment",
    "Interfaculty Studies",
    "Dental Medicine and Oral Health Sciences",
    "Medicine and Health Sciences",
    "Desautels Faculty of Management",
    "Arts",
    "Science",
    "Engineering",
    "Education",
    "Law",
    "Schulich School of Music",
    "Graduate and Postdoctoral Studies",
    "School of Continuing Studies",
    "Agricultural and Environmental Sciences",
    "Dental Medicine and Oral Health Sciences",
    "Bieler School of Environment",
    "Interfaculty Studies",
    "Medicine and Health Sciences",
    "Arts",
    "Science",
    "Engineering",
]



MCGILL_MAJORS = [
    "Accounting",
    "African Studies",
    "Agribusiness",
    "Agricultural Economics",
    "Animal Biology",
    "Animal Health and Disease",
    "Anthropology",
    "Applied Ecology",
    "Applied Mathematics",
    "Architecture",
    "Art History",
    "Atmospheric Science",
    "Bioengineering",
    "Biology",
    "Biology - Cell/Molecular",
    "Biology - Organismal",
    "Bioresource Engineering",
    "Business Analytics",
    "Canadian Studies",
    "Chemical Engineering",
    "Chemistry",
    "Civil Engineering",
    "Classics",
    "Cognitive Science",
    "Communication Studies",
    "Computer Engineering",
    "Computer Science",
    "Dentistry",
    "Dietetics",
    "Earth Sciences and Economics",
    "East Asian Studies",
    "Economics",
    "Economics for Management Students",
    "Education in Global Contexts",
    "Electrical Engineering",
    "English - Cultural Studies",
    "English - Drama and Theatre",
    "English - Literature",
    "Environment",
    "Environment - Atmospheric Environment and Air Quality",
    "Environment - Biodiversity and Conservation",
    "Environment - Ecological Determinants of Health - Cellular",
    "Environment - Ecological Determinants of Health - Population",
    "Environment - Environmetrics",
    "Environment - Food Production and Environment",
    "Environment - Land Surface Processes and Environmental Change",
    "Environment - Renewable Resource Management",
    "Environment - Water Environments and Ecosystems",
    "Environmental Biology",
    "Environmental Economics",
    "Field Crops and Horticulture",
    "Finance",
    "Food Science",
    "Gender, Sexuality, Feminist, and Social Justice Studies",
    "Geography",
    "Geography - Physical Geography",
    "Geography - Urban Studies",
    "Geology",
    "German Studies",
    "Global Engineering",
    "Global Food Security",
    "Hispanic Studies",
    "History",
    "Information Technology Management",
    "International Development Studies",
    "International Management",
    "Italian Studies",
    "Jewish Studies",
    "Kinesiology",
    "Langue et littérature françaises - Études et pratiques littéraires",
    "Langue et littérature françaises - Traduction",
    "Latin American and Caribbean Studies",
    "Liberal Arts",
    "Life Sciences - Biological and Agricultural",
    "Life Sciences - Multidisciplinary",
    "Linguistics",
    "Livestock",
    "Managing for Sustainability",
    "Marketing",
    "Materials Engineering",
    "Mathematics",
    "Mathematics and Computer Science",
    "Mathematics and Statistics for Management",
    "Mechanical Engineering",
    "Mechanical Engineering - Design",
    "Medicine",
    "Microbiology and Molecular Biotechnology",
    "Mining Engineering",
    "Music",
    "Music Education",
    "Nutrition",
    "Nutrition - Food Function and Safety",
    "Nutrition - Global Nutrition",
    "Nutrition - Metabolism, Health and Disease",
    "Nutrition - Sports Nutrition",
    "Organizational Behaviour and Human Resources",
    "Philosophy",
    "Physical and Health Education",
    "Physics",
    "Plant Biology",
    "Political Science",
    "Professional Agrology",
    "Psychology",
    "Religious Studies",
    "Retail Management",
    "Russian",
    "Social Work",
    "Sociology",
    "Software Engineering",
    "Soil and Water Resources",
    "Statistics",
    "Strategic Management",
    "Sustainable Agriculture Systems",
    "Sustainability, Science and Society",
    "Wildlife Biology",
    "World Islamic and Middle East Studies"
]

# We'll use majors list as a pool for minors too, but force "minor != major"
# You can also define a separate MINORS list if you have one.
MCGILL_MINORS = list(MCGILL_MAJORS)

FIRST_NAMES = [
    "Amir", "Leila", "Rania", "Bilal", "Yasmin",
    "Zain", "Farah", "Nadia", "Hassan", "Mariam",
    "Olivier", "Camille", "Julien", "Aurélie", "Mathieu",
    "Élodie", "Laurent", "Sébastien", "Valérie", "Geneviève",
    "Aarav", "Priya", "Ananya", "Rohan", "Ishaan",
    "Meera", "Kavya", "Nikhil", "Saanvi", "Aria",
    "Wei", "Jia", "Yifan", "Xinyi", "Ming",
    "Hana", "Yuki", "Sora", "Haruto", "Aiko",
    "Diego", "Valentina", "Lucía", "Santiago", "Camila",
    "Mateusz", "Zofia", "Anastasia", "Dmytro", "Iulia"
]

LAST_NAMES = [
    "Tremblay", "Gagnon", "Lavoie", "Côté", "Bouchard",
    "Lefebvre", "Pelletier", "Roy", "Girard", "Mercier",
    "Haddad", "Fakhoury", "Nassar", "Kassem", "Saleh",
    "Kaur", "Chopra", "Sharma", "Gupta", "Mehta",
    "Zhang", "Li", "Wang", "Liu", "Chen",
    "Tanaka", "Sato", "Suzuki", "Nakamura", "Kobayashi",
    "Rodriguez", "Hernandez", "Lopez", "Gomez", "Castillo",
    "Nowak", "Kowalski", "Novak", "Petrov", "Ivanova",
    "Mensah", "Okafor", "Diallo", "Benali", "Elmansouri",
    "Papadopoulos", "Ionescu", "Santos", "Ferreira", "Silva"
]

# Wide-range (some unexpected) experiences
EXPERIENCE_POOL = [
    {"company": "Cirque du Soleil", "position": "Stage Operations Assistant", "dates": "Summer 2024", "country": "Canada"},
    {"company": "STM (Société de transport de Montréal)", "position": "Customer Information Agent", "dates": "Fall 2023", "country": "Canada"},
    {"company": "National Film Board of Canada", "position": "Post-Production Assistant", "dates": "Winter 2024", "country": "Canada"},
    {"company": "Parks Canada", "position": "Visitor Experience Assistant", "dates": "Summer 2023", "country": "Canada"},
    {"company": "Montréal Botanical Garden", "position": "Horticulture Assistant", "dates": "Spring 2023", "country": "Canada"},
    {"company": "Hydro-Québec", "position": "Data Entry & Quality Assistant", "dates": "Winter 2023", "country": "Canada"},
    {"company": "CAE", "position": "Simulation Support Intern", "dates": "Fall 2024", "country": "Canada"},
    {"company": "Bombardier", "position": "Cabin Systems Support Intern", "dates": "Summer 2024", "country": "Canada"},
    {"company": "Ubisoft Montréal", "position": "Gameplay QA Analyst", "dates": "Fall 2023", "country": "Canada"},
    {"company": "Shopify", "position": "Merchant Support Associate", "dates": "Summer 2022", "country": "Canada"},

    {"company": "Oxfam", "position": "Community Outreach Volunteer", "dates": "Spring 2023", "country": "United Kingdom"},
    {"company": "BBC", "position": "Audience Research Assistant", "dates": "Summer 2022", "country": "United Kingdom"},
    {"company": "National Trust", "position": "Heritage Site Steward", "dates": "Fall 2023", "country": "United Kingdom"},
    {"company": "Transport for London", "position": "Operations Support Trainee", "dates": "Winter 2024", "country": "United Kingdom"},
    {"company": "Royal Botanic Gardens, Kew", "position": "Collections Assistant", "dates": "Summer 2023", "country": "United Kingdom"},

    {"company": "Air France", "position": "Ground Operations Assistant", "dates": "Summer 2023", "country": "France"},
    {"company": "Louvre Museum", "position": "Visitor Services Assistant", "dates": "Spring 2022", "country": "France"},
    {"company": "Decathlon", "position": "Retail Operations Associate", "dates": "Fall 2023", "country": "France"},
    {"company": "SNCF", "position": "Passenger Services Trainee", "dates": "Winter 2024", "country": "France"},
    {"company": "Orange", "position": "Customer Success Intern", "dates": "Summer 2024", "country": "France"},

    {"company": "Siemens", "position": "Facilities Operations Intern", "dates": "Summer 2023", "country": "Germany"},
    {"company": "Deutsche Bahn", "position": "Station Operations Assistant", "dates": "Fall 2022", "country": "Germany"},
    {"company": "Bayer", "position": "Lab Operations Assistant", "dates": "Spring 2024", "country": "Germany"},
    {"company": "Bosch", "position": "Manufacturing Quality Intern", "dates": "Winter 2023", "country": "Germany"},
    {"company": "Berlin Museum Island", "position": "Exhibit Support Assistant", "dates": "Summer 2022", "country": "Germany"},

    {"company": "Google", "position": "Data Center Operations Intern", "dates": "Summer 2024", "country": "United States"},
    {"company": "National Park Service", "position": "Trail Steward Intern", "dates": "Summer 2023", "country": "United States"},
    {"company": "Smithsonian Institution", "position": "Collections Assistant", "dates": "Fall 2022", "country": "United States"},
    {"company": "Whole Foods Market", "position": "Inventory & Stocking Associate", "dates": "Winter 2023", "country": "United States"},
    {"company": "REI", "position": "Outdoor Gear Specialist", "dates": "Spring 2024", "country": "United States"},

    {"company": "Nintendo", "position": "Product Testing Assistant", "dates": "Fall 2023", "country": "Japan"},
    {"company": "JR East", "position": "Station Support Staff", "dates": "Winter 2024", "country": "Japan"},
    {"company": "UNIQLO", "position": "Retail Team Lead", "dates": "Summer 2022", "country": "Japan"},
    {"company": "National Museum of Nature and Science", "position": "Visitor Programs Assistant", "dates": "Spring 2023", "country": "Japan"},
    {"company": "Rakuten", "position": "Marketplace Operations Intern", "dates": "Summer 2024", "country": "Japan"},

    {"company": "Singapore Airlines", "position": "Service Operations Trainee", "dates": "Summer 2023", "country": "Singapore"},
    {"company": "Marina Bay Sands", "position": "Events Support Assistant", "dates": "Fall 2022", "country": "Singapore"},
    {"company": "GovTech Singapore", "position": "Digital Services Intern", "dates": "Winter 2024", "country": "Singapore"},
    {"company": "Grab", "position": "Operations Analyst Intern", "dates": "Summer 2024", "country": "Singapore"},
    {"company": "National Library Board", "position": "Digital Archive Assistant", "dates": "Spring 2023", "country": "Singapore"},

    {"company": "IKEA", "position": "Logistics & Fulfillment Associate", "dates": "Fall 2023", "country": "Sweden"},
    {"company": "Ericsson", "position": "Network Support Intern", "dates": "Summer 2024", "country": "Sweden"},
    {"company": "Swedish Museum of Natural History", "position": "Education Programs Assistant", "dates": "Winter 2023", "country": "Sweden"},
    {"company": "Vattenfall", "position": "Sustainability Reporting Intern", "dates": "Spring 2024", "country": "Sweden"},
    {"company": "Stockholm City Library", "position": "Library Services Assistant", "dates": "Summer 2022", "country": "Sweden"},

    {"company": "Qatar Airways", "position": "Passenger Services Trainee", "dates": "Fall 2023", "country": "Qatar"},
    {"company": "Hamad Medical Corporation", "position": "Clinic Administration Assistant", "dates": "Winter 2024", "country": "Qatar"},
    {"company": "Doha Film Institute", "position": "Festival Operations Volunteer", "dates": "Spring 2023", "country": "Qatar"},
    {"company": "Qatar Museums", "position": "Gallery Attendant", "dates": "Summer 2022", "country": "Qatar"},
    {"company": "Qatar Foundation", "position": "Education Program Support", "dates": "Summer 2024", "country": "Qatar"},
]



PREFERRED_COUNTRIES_TO_WORK_IN = [
    "Canada", "Canada", "Canada", "Canada", "Canada",
    "United States", "United States", "United States", "United States",
    "United Kingdom", "United Kingdom", "United Kingdom",
    "France", "France", "France",
    "Germany", "Germany", "Germany",
    "Switzerland", "Switzerland",
    "Netherlands", "Netherlands",
    "Sweden", "Sweden",
    "Norway",
    "Denmark",
    "Ireland", "Ireland",
    "Spain", "Spain",
    "Italy", "Italy",
    "Portugal",
    "Belgium",
    "Austria",
    "Australia", "Australia",
    "New Zealand",
    "Japan", "Japan",
    "South Korea",
    "Singapore", "Singapore",
    "United Arab Emirates",
    "Qatar",
    "Saudi Arabia",
    "Mexico",
    "Brazil",
    "South Africa",
    "India",
    "China"
]


def make_unique_email(first: str, last: str) -> str:
    # Nearly collision-free; backend still guarantees uniqueness.
    suffix = random.randint(10000, 99999999)
    return f"{first.lower()}.{last.lower()}{suffix}@mail.mcgill.ca"

def shuffled_cycle(lst):
    """Infinite generator that cycles through a shuffled list (reshuffles each cycle)."""
    items = lst[:]
    random.shuffle(items)
    idx = 0
    while True:
        yield items[idx]
        idx += 1
        if idx >= len(items):
            random.shuffle(items)
            idx = 0


def choose_experiences(unique_guard: set, k_min=1, k_max=2):
    for _ in range(30):
        k = random.randint(k_min, k_max)
        exp = random.sample(EXPERIENCE_POOL, k=k)
        # uniqueness key based on (company, position)
        key = tuple(sorted((e["company"], e["position"]) for e in exp))
        if key not in unique_guard:
            unique_guard.add(key)
            return exp
    return exp

def create_100_users():
    major_gen = shuffled_cycle(MCGILL_MAJORS)
    minor_gen = shuffled_cycle(MCGILL_MINORS)

    used_skill_sets = set()
    used_interest_sets = set()
    used_exp_sets = set()

    created = 0
    attempts = 0

    while created < 50:
        attempts += 1

        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)

        major = next(major_gen)

        # Ensure minor != major (try a few times)
        minor = next(minor_gen)
        for _ in range(10):
            if minor != major:
                break
            minor = next(minor_gen)

        faculty = random.choice(MCGILL_FACULTIES)
        preferred_work_country = random.choice(PREFERRED_COUNTRIES_TO_WORK_IN)

        raw_experience = choose_experiences(used_exp_sets, k_min=1, k_max=2)
        professional_experience = []
        for e in raw_experience:
            industries = get_industry(e["position"], e["company"])
            industry = industries[0][0] if industries else "Unknown"

            professional_experience.append({
                "company": e["company"],
                "industry": industry,
                "position": e["position"],
                "dates": e["dates"],
                "country": e["country"],
            })

        user = {
            "firstName": first,
            "lastName": last,
            "email": make_unique_email(first, last),  # must end with @mail.mcgill.ca
            "faculty": faculty,
            "major": major,
            "minor": minor,
            "preferred_work_country": preferred_work_country,
            "professional_experience": professional_experience,
            "isGuest": False,
            "password": "<PASSWORD>"
        }

        r = requests.post(CREATE_USER_URL, json=user, timeout=20)

        if r.status_code == 201:
            created += 1
            print(f"[{created:03d}/50] CREATED  {user['email']}")
            print(f"  major={user['major']} | minor={user['minor']}")
            print(f"  exp={[(e['company'], e['position']) for e in user['professional_experience']]}")
        elif r.status_code == 200:
            # email collision (rare) => not inserted
            print(f"[SKIP exists] {user['email']}")
        else:
            try:
                print(f"[ERROR] status={r.status_code} body={r.json()}")
            except Exception:
                print(f"[ERROR] status={r.status_code} body={r.text}")
            time.sleep(0.2)

    print(f"\nDone. Inserted 50 new users (took {attempts} attempts).")

if __name__ == "__main__":
    create_100_users()
