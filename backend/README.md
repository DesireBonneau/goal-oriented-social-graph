# Backend Documentation

## Overview
This is a **Flask** application serving as the REST API and logic layer. It connects to **MongoDB Atlas** for data persistence.

## Structure
- `app.py`: Application entry point and route definitions.
- `db.py`: Database connection factory (`get_db`, `check_connection`).
- `algorithm.py`: Core logic for matching and similarity (currently placeholder).
- `test_api.py`: Pytest suite.
- `services/cv_service.py`: Gemini-powered CV parser.

## Setup & Run

### 1. Environment
Ensure you are using the correct Python version (see `.python-version`).
**Always use the virtual environment!**

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> **IDE Setup**: Make sure your IDE (VS Code, PyCharm) is using the interpreter at `backend/.venv/Scripts/python.exe` (Windows) or `backend/.venv/bin/python` (Mac/Linux). If you see import errors, you are likely using the global Python environment.

Create a `.env` file:
```bash
MONGO_URI=mongodb+srv://...
CLIENT_URL=http://localhost:5173
FLASK_ENV=development
```

### 2. Commands
| Command | Description |
| :--- | :--- |
| `python app.py` | Start the development server (Port 5000) |
| `pytest` | Run automated tests |

## API Endpoints

### User
- `POST /api/user`: Create a new user profile.
- `PATCH /api/user`: Update user profile.

### Graph
- `GET /api/graph`: Retrieve the node/link structure.
- `POST /api/search`: Run similarity search on the graph.

### System
- `GET /health`: Check DB connection status.

## Testing
We use **pytest**.
To run tests using a separate test database:
```bash
export FLASK_ENV=testing
pytest
```
