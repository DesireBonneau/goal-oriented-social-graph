# Goal-Oriented Social Graph

A social networking platform connecting students based on shared goals and academic paths.

## Project Structure

This monorepo contains two main parts:

- **[Frontend](./frontend/README.md)**: React + Vite application (UI).
- **[Backend](./backend/README.md)**: Flask + MongoDB application (API).

> **AI Agents & Contributors**: Please read [LLM_CONTEXT.md](./LLM_CONTEXT.md) for architectural context and guidelines.

Please refer to the detailed `README.md` in each directory for specific architecture and contribution guides.

## Quick Start

### 1. Prerequisites
- **Node.js**: v22+ (The script will check this, or install via Volta).
- **Python**: v3.12+
- **MongoDB Atlas**: Ensure you have your connection string.

### 2. Run the App (Easy Mode)
The project includes a `run.js` script that automates environment setup, dependency installation, and startup for both frontend and backend.

**Standard Start:**
```bash
node run.js
```

**Fresh Start (Reset & Clean):**
If you encounter issues or want a clean slate (reinstalls all dependencies):
```bash
node run.js --clean
```

### Features of `run.js`:
- **Auto-Install**: Installs `pip` and `npm` dependencies if missing.
- **Port Cleanup**: Automatically kills processes on default ports (5000/5173).
- **Volta Support**: Switches to Node 22 automatically if Volta is installed.
- **Parallel Run**: Starts Flask and Vite in a single terminal.

---

## Manual Setup (Alternative)

If you prefer to run services manually:

### 1. Setup Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
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
