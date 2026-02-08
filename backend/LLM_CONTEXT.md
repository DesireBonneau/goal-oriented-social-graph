# Backend Context for LLMs

## Tech Stack
- **Framework**: Flask (Python 3.12+).
- **Database**: MongoDB Atlas (accessed via `pymongo`).
- **Testing**: `pytest`.
- **Environment**: `python-dotenv` loads `.env`. Always run in `.venv`.
- **AI Dependencies**: `google-genai` (SDK for Gemini), `PyPDF2`.

## Architecture
- **`app.py`**: Monolithic entry point. Defines all routes (`/api/...`).
- **`db.py`**: Database factory.
    - `get_db()`: Returns the database object based on `FLASK_ENV` (prod vs testing).
    - `check_connection()`: Used by health checks.
- **`algorithm.py`**: Contains the logic for the "Goal-Oriented" matching.
    - *Status*: Currently using placeholder/mock logic. Needs to be replaced with real TF-IDF or vector similarity.
- **`services/cv_service.py`**: Handles CV parsing using Google's Gemini Flash model (`google.genai` SDK).
    - *Utility*: Extracts structured data (JSON) from PDF resumes.


## Principles & Rules
1. **Strict Configuration**: The app MUST fail at startup if `MONGO_URI` or `CLIENT_URL` are missing. Do not fallback to defaults that could hide configuration errors.
2. **Environment Isolation**:
    - `FLASK_ENV=testing` switch the DB to `social_graph_test`.
    - **Never** write tests that touch the production database.
3. **CORS**: Strictly limited to `CLIENT_URL`.

## Database Schema (Implicit)
*While MongoDB is schemaless, we follow this structure:*

### `users` Collection
```json
{
  "email": "String (Unique, @mail.mcgill.ca)",
  "firstName": "String",
  "lastName": "String",
  "graduationYear": "Integer",
  "faculty": "String",
  "major": "String",
  "minor": "String (Optional)",
  "clubs": ["String"],
  "experience": [{
    "position": "String",
    "company": "String",
    "dates": "String",
    "location": "String"
  }],
  "linkedinUrl": "String",
  "socials": {
    "github": "String",
    "pinterest": "String",
    "other": "String"
  },
  "preferredWorkPlace": "String"
}
```

### `connections` (Planned)
- Store edges as separate documents or embedded in users (TBD).
