# Walkthrough: Goal-Oriented Social Graph Frontend

## How to Run
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open the link shown in the terminal (usually `http://localhost:5173`).

## Simulation Flow
The app is designed to simulate the full user journey with mock data.

### 1. Authentication (Mock)
- Enter **any valid McGill email** (e.g., `test@mail.mcgill.ca`).
- The system validates the domain regex.

### 2. Profile Setup
- Enter your details (Major, Experience).
- This data is used to "personalize" the You-node in the graph.

### 3. Connection Import
- **Option A**: Upload a LinkedIn `Connections.csv`.
- **Option B**: Click **"Skip (Use Mock Data)"** to generate a random graph immediately.

### 4. Graph Exploration & Goal Search
- **Interact**: Click on nodes to see their details in the sidebar.
- **Search**: Type a goal like "Software Engineer" or "Research" in the top bar.
    - **Observe**: Nodes with relevant backgrounds will **glow blue** and increase in size.
    - **Note**: This uses a keyword matching simulation in `mockData.js`.

## Key Components
- **`GraphViz.jsx`**: Handles the force-directed graph, including the custom "aura" rendering for high relevance scores.
- **`mockData.js`**: Generates the social graph structure and simulates the "Goal Score" re-weighting logic.
- **`manifest`**: Stack is Vite + React + Tailwind CSS.
