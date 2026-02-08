# Goal-Oriented Social Graph

## Project Structure
- `frontend/`: React + Vite application
- `backend/`: Flask + MongoDB application

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas Account (or local instance)

---

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and Activate Virtual Environment (REQUIRED):**
   *Do not skip this step. We use `venv` to manage dependencies.*
   ```bash
   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate
   ```

3. **Install Dependencies:**
   **Context:** Make sure your virtual environment is activated (you should see `(venv)` in your terminal).
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   - Create a `.env` file in the `backend/` directory.
   - **IMPORTANT**: Do not hardcode secrets. The app will fail if variables are missing.
   - Template:
     ```bash
     MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
     CLIENT_URL=http://localhost:5173
     FLASK_ENV=development
     PORT=5000
     ```

5. **Run the Server:**
   ```bash
   python app.py
   ```
   Server will start at `http://localhost:5000`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node Modules:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   - Create a `.env` file in `frontend/`.
   - Template:
     ```bash
     VITE_API_URL=http://localhost:5000/api
     ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   App will be available at `http://localhost:5173`.

## Testing

### Backend
Make sure your `venv` is active.
```bash
cd backend
export FLASK_ENV=testing
pytest
```
*Note: This connects to the `social_graph_test` database.*
