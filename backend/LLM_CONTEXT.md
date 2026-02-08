# Backend Context for LLMs

## Tech Stack
- **Framework**: Flask (Python 3.12+).
- **Database**: MongoDB Atlas (accessed via `pymongo`).
- **Testing**: `pytest`.
- **Environment**: `python-dotenv` loads `.env`. Always run in `.venv`.
- **Auth**: `werkzeug.security` for password hashing. **Token-based** authentication for API protection.
- **AI Dependencies**: `google-genai` (SDK for Gemini), `PyPDF2`.

## Architecture
- **`app.py`**: Monolithic entry point. Defines all routes (`/api/...`).
    - Uses `@require_auth` decorator for protected routes.
- **`db.py`**: Database factory.
    - `get_db()`: Returns the database object based on `FLASK_ENV`.
    - `check_connection()`: Used by health checks.
- **`algorithm.py`**: Core logic for matching and similarity.
    - Also contains `generate_mock_graph_data` used by the seeder.
- **`seed.py`**: Populates the database with mock users and connections.
- **`services/cv_service.py`**: Handles CV parsing using Google's Gemini Flash model (`google.genai` SDK).
    - *Utility*: Extracts structured data (JSON) from PDF resumes.


## Principles & Rules
1. **Strict Configuration**: The app MUST fail at startup if `MONGO_URI` or `CLIENT_URL` are missing. Do not fallback to defaults that could hide configuration errors.
2. **Environment Isolation**:
    - `FLASK_ENV=testing` switch the DB to `social_graph_test`.
    - `FLASK_ENV=development` switch the DB to `social_graph_dev`.
    - **Never** write tests that touch the production database.
3. **CORS**: Strictly limited to `CLIENT_URL`.
4. **Security**:
    - **Guests**: Read-only access to Graph. No Token.
    - **Users**: Must provide `Authorization: Bearer <token>` to modify data.
    - **Token Scope**: Users can only modify *their own* data.

## Database Schema (Implicit)
*While MongoDB is schemaless, we follow this structure:*

### `users` Collection
```json
{
  "email": "String (Unique, @mail.mcgill.ca)",
  "password": "String (Hashed, Optional for legacy/guest)",
  "token": "String (Bearer Token for Auth)",
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
  "preferredWorkPlace": "String",
  "isGuest": "Boolean (False for registered users)"
}
```

### `connections` Collection
```json
{
  "source": "String (User ID)",
  "target": "String (User ID)",
  "type": "String (direct | indirect | fuzzy)",
  "strength": "Float (0.0 - 1.0)"
}
```
