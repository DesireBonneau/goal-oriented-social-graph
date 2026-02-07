# goal-oriented-social-graph

## Frontend:

### **Project Overview: Goal-Oriented Social Graph (McGill University)**

**Project Vision:**
A "pathfinding" networking platform for McGill students. Unlike LinkedIn (which is static and performative), this app focuses on **Goal-Oriented Discovery**. It helps users find people they are structurally near (via mutuals or shared paths) who align with a specific professional or academic goal.

**Core Concept:**
*   **The Goal-Conditioned Graph:** The social graph is dynamic. When a user inputs a goal (e.g., "Software Engineering at Tesla"), the graph doesn't change its structure, but it **re-highlights** and **re-weights** itself.
*   **Fuzzy/Proxy Connections:** Users can see people they don't know (3rd+ degree) if those people are highly relevant to their goal and reachable through their existing network.

---

### **Technical Stack**
*   **Frontend:** React, Tailwind CSS, `react-force-graph`.
*   **Backend:** Python (FastAPI/Flask).
*   **Database:** **MongoDB Atlas** (using Vector Search for goal matching).
*   **AI Integration:** 
    *   **Google Gemini API:** Natural language parsing of goals and generating "Why this match?" summaries.
    *   **ElevenLabs (Optional):** Audio-bios for nodes.
*   **Blockchain (Optional):** Solana for verified student identity.

---

### **Key Frontend Architecture**
1.  **Layout:** A side-panel interface. 
    *   **Center:** A 2D Force-Directed Graph.
    *   **Right Panel:** "Node Inspector" showing student details and AI-generated context.
    *   **Top:** Smart Search Bar (supporting plain English goals and category chips).
2.  **Visual Logic:**
    *   **Direct Connections:** Solid lines.
    *   **Fuzzy Connections:** Dotted/faded lines with a glowing "aura" for high-relevance matches.
    *   **Re-highlighting:** When a goal is set, the backend returns a `score (0.0 - 1.0)`. The frontend uses this to scale node size and brightness (opacity).
3.  **Navigation:**
    *   **Re-centering:** Clicking a friend in the graph or sidebar pans the camera to them and triggers a lazy-load fetch for their specific 1st/2nd-degree neighbors.

---

### **Data Schema (The Contract)**
The Frontend and Backend will communicate via a standardized Graph JSON:
*   **Nodes:** `{ id, name, major, score, isFuzzy, tags, summary }`
    *   `score`: Determines visual prominence.
    *   `summary`: Gemini-generated explanation of the match.
*   **Edges:** `{ source, target, strength, type }`
    *   `type`: "direct" or "fuzzy".

---

### **MVP Philosophy**
*   **Mock Data First:** The frontend should be built to render a `mockData.json` so it can be developed in parallel with the backend.
*   **Data-Driven UI:** The UI is a "dumb" renderer of the graph data; all weighting logic (scoring) happens on the backend via MongoDB Vector Search and Gemini.
*   **Focus on Narrative:** The demo must show a user entering a goal, the graph "lighting up," and the user discovering a path to a high-value connection they didn't know they had.

---

### **Immediate Next Steps for the LLM:**
1.  Create a **Mock Data Generator** script that produces a graph of ~20-30 nodes with varying "goal scores."
2.  Boilerplate a **React + Force Graph** component that can handle node highlighting and sidebar selection.
3.  Design the **MongoDB Schema** for a student profile that includes "Embeddings" for vector-based goal matching.
