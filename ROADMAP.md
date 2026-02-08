# Project Roadmap

## Phase 1: Foundation (Completed)
- [x] **Frontend Setup**: React + Vite + Tailwind initialized.
- [x] **Backend Setup**: Flask + MongoDB connected.
- [x] **Integration**: Frontend fetching graph/search from Backend.
- [x] **Dev Environment**: Standardized (`.venv`, `.nvmrc`, `README.md`).

## Phase 2: Core Algorithm et Data (The "Brain")
*Focus: Replacing mock logic with real intelligence.*
- [ ] **Data Modeling**
    - [ ] Define strict MongoDB schemas for `Users` and `Connections`.
    - [ ] Create database indexes for performance (search).
- [ ] **Similarity Algorithm**
    - [ ] Replace `algorithm.py` placeholder.
    - [ ] Implement NLP (TF-IDF or Embeddings) to compare User Profiles (Interests, Goals).
    - [ ] Implement `calculate_score(user_a, user_b)` returning 0-100 match.
- [ ] **Graph Generation**
    - [ ] Update `/api/graph` to return *real* nodes from DB instead of random ones.
    - [ ] Implement pagination or "viewport loading" if graph gets too big.

## Phase 3: User Experience & Flows
*Focus: Making it usable for real students.*
- [ ] **Authentication**
    - [ ] Secure `AuthGate`: Implement JWT or OAuth (Google/LinkedIn Login).
    - [ ] Protect backend routes (require valid session).
- [ ] **Data Import Strategy**
    - [ ] Implement CSV Parser in `LinkedInImport.jsx`.
    - [ ] Add Backend Endpoint `/api/import` to process/sanitize bulk connections.
- [ ] **Profile Enrichment**
    - [ ] "Goal" selector (e.g., "Find a Co-founder", "Study Buddy").
    - [ ] Add these goals to the `algorithm` weighting logic.

## Phase 4: Social Features (The "Graph")
*Focus: Interaction.*
- [ ] **Graph Interaction**
    - [ ] clicking "Connect" on a node sends a real request.
    - [ ] "Connection Request" inbox.
- [ ] **Advanced Visualization**
    - [ ] Filter Graph: Toggle "Only CS Majors", "High Match Only".
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
- [ ] **Security Audit**
    - [ ] Rate limiting APIs.
    - [ ] Input sanitization.
