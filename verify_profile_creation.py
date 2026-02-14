import sys
import os
import json
from datetime import date

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.user.user_profile import UserProfile, Experience
    print("SUCCESS: Imported UserProfile and Experience")
except ImportError as e:
    print(f"ERROR: Could not import UserProfile: {e}")
    sys.exit(1)

def test_create_profile():
    print("\n--- Testing Profile Creation ---")
    
    # 1. Create Experience with new date fields
    exp = Experience(
        position="Software Engineer",
        company="Tech Corp",
        start_date="2023-01",
        end_date="2024-01",
        location="Montreal",
        industries=["Software"]
    )
    print(f"Created Experience: {exp}")

    # 2. Create UserProfile
    user = UserProfile(
        email="test@mail.mcgill.ca",
        first_name="Test",
        last_name="User",
        graduation_year=2025,
        faculty="Science",
        major="Computer Science",
        experience=[exp]
    )
    print(f"Created UserProfile: {user.first_name} {user.last_name}")

    # 3. Test serialization to Dictionary (what goes to MongoDB)
    try:
        doc = user.to_mongo_document()
        print("\nSUCCESS: Serialized to MongoDB document:")
        print(json.dumps(doc, indent=2, default=str))
    except Exception as e:
        print(f"\nERROR: Failed to serialize: {e}")

if __name__ == "__main__":
    test_create_profile()
