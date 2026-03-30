# Project Roadmap

## Phase 1: Foundation (Completed)
- [x] **Frontend Setup**: React + Vite + Tailwind initialized.
- [x] **Backend Setup**: Flask + MongoDB connected.
- [x] **Integration**: Frontend fetching graph/search from Backend.
- [x] **Dev Environment**: Standardized (`.venv`, `.nvmrc`, `README.md`).

## Phase 2: Core Algorithm & Data (The "Brain")
*Focus: Replacing mock logic with real intelligence.*
- [x] **Data Modeling**
    - [x] JSON Schema validation applied to `users` and `connections` collections (`core/db_schema.py`).
    - [x] Database indexes created for performance: `email` (unique), text search, `major`, `faculty`, `clubs`, `experience.position/company`, `token`, connection pairs.
    - [x] Schema applied automatically on every app startup (idempotent).
- [x] **Similarity Algorithm**
    - [x] Implemented Extended Gower Similarity (`pairwise_node_similarity.py`).
    - [x] Supports robust evaluation of academic variables and missing variables.
    - [x] `pairwise_similarity_from_mongo_docs` returns 0.0 to 1.0 match.
    - [x] `/api/similarity` endpoint returns score + field-by-field breakdown.
- [x] **Graph Generation**
    - [x] Updated `/api/graph` to return *real* connections from the MongoDB database matrix.

## Phase 3: Smart Search & User Flows (Completed)
*Focus: Connecting users based on goals and skills (e.g., Tutoring Matching).*
- [x] **Smart Search Engine**
    - [x] Implemented robust local NLP matching (stop-words, synonyms).
    - [x] Preserved Gemini API as a monitored fallback mechanism.
    - [x] Tracked Gemini fallback probability in `search_stats.json`.
- [x] **Search Experience UI**
    - [x] Live dropdown under search bar (as-you-type, debounced).
    - [x] Result cards show % match badge + matched experience snippet for keyword searches.
    - [x] Clicking a profile opens Sidebar without reloading graph.
    - [x] Sidebar: keyword search context section (relevant experience, matched fields).
    - [x] Sidebar: similarity score + field-by-field breakdown (logged-in only).
    - [x] Sidebar: "Compare with someone else" mini search bar for arbitrary profile comparison.
    - [x] Graph: state-aware node colors (selected=pink, comparison=orange, self=bright emerald).
    - [x] Graph: highlighted edge between compared profiles; virtual dashed edge if no real link.
    - [x] Graph: camera zooms to one node (logged out) or fits both nodes (comparison mode).

## Phase 4: Social Features (The "Graph")
*Focus: Interaction.*
- [ ] **Graph Interaction**
    - [ ] Clicking "Connect" on a node sends a real connection request to the backend.
    - [ ] "Connection Request" inbox (notifications panel).
- [ ] **Advanced Visualization**
    - [ ] Filter Graph: Toggle "Only CS Majors", "High Match Only", etc.
    - [ ] Pathfinding: "How am I connected to X?" (Degrees of separation).

## Phase 5: Production & Polish
*Focus: Launch.*
- [ ] **Deployment**
    - [ ] Containerize Backend (Docker).
    - [ ] Deploy Frontend (Vercel/Netlify).
    - [ ] Deploy Backend (Render/Heroku/AWS).
- [ ] **Optimization**
    - [ ] Cache graph responses (Redis?).
    - [ ] Optimize 3D Graph rendering (LOD for large datasets).
    - [ ] Graph pagination / viewport loading for large user counts.
- [ ] **Security Audit**
    - [ ] Rate limiting APIs.
    - [ ] Input sanitization.
