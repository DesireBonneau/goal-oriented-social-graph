# Goal-Oriented Social Graph

A social networking platform connecting students based on shared goals and academic paths.

## Project Structure

This monorepo contains two main parts:

- **[Frontend](./frontend/README.md)**: React + Vite application (UI).
- **[Backend](./backend/README.md)**: Flask + MongoDB application (API).

Please refer to the detailed `README.md` in each directory for specific architecture and contribution guides.

## Quick Start

### Prerequisites
- **Node.js** (v22.17.0) - *Use `nvm use`*
- **Python** (v3.12.8)
- **MongoDB Atlas** credentials

### 1. Setup Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure .env (See backend/README.md)
python app.py
```

### 2. Setup Frontend
```bash
cd frontend
npm install

# Configure .env (See frontend/README.md)
npm run dev
```

## Testing & Health

### Health Check
Verify the system is running:
```bash
curl http://localhost:5000/health
```

### Running Tests
- **Backend**: `cd backend && export FLASK_ENV=testing && pytest`
- **Frontend**: `cd frontend && npm test` *(See frontend status)*

For detailed testing guides, check the respective [Frontend](./frontend/README.md) and [Backend](./backend/README.md) documentation.
