# Goal-Oriented Social Graph - Frontend Implementation Plan

## Goal Description
Build a "pathfinding" networking platform visualization where users can discover connections relevant to their professional or academic goals. The interface will center around a dynamic Force-Directed Graph that re-weights nodes based on goal relevance.

## User Review Required
> **Revised Stack**:
> - **Framework**: Vite + React + JavaScript (No TypeScript)
> - **Styling**: Tailwind CSS
> - **Visualization**: `react-force-graph-2d`
> - **Data Safety**: JSDoc comments for data shapes.

> **"Cold Start" Connection Strategy**:
> - **LinkedIn Import**: Drag-and-drop CSV parser for bulk connections.
> - **Manual Add**: "Add Connection" button on user profiles.
> - **Profile Editor**: A dedicated screen to set Major, Minor, Internships, etc.

## Proposed Changes

### Project Initialization
- Initialize a new Vite project (`npm create vite@latest frontend -- --template react`).
- Configure Tailwind CSS.

### Core Components

#### `src/components/Graph/GraphViz.jsx`
- Wrapper around `react-force-graph-2d`.
- Implements the "glowing aura" logic.

#### `src/components/Layout/Sidebar.jsx`
- Displays details of the selected node.
- **Action**: "Add Connection" button if not already connected.

#### `src/components/UI/SearchBar.jsx`
- Input for user goals.

#### `src/pages/Profile/ProfileEditor.jsx`
- **Form Fields**:
  - University (Default: McGill)
  - Major / Minor
  - Experience (Internships, Jobs)
  - Bio
- **Usage**: Shown after "Auth" and editable later.

#### `src/components/Onboarding/LinkedInImport.jsx`
- File input for LinkedIn `Connections.csv`.

### Data Model (Conceptual)
**Node Structure Update:**
```javascript
{
  id: "user_1",
  name: "Alice Smith",
  info: {
    major: "CS",
    minor: "Math",
    experience: ["Tesla Intern", "TA for COMP 202"]
  },
  score: 0.95, 
  isFuzzy: false,
  connections: ["user_2", "user_5"] // Adjacency list
}
```

## Verification Plan

### Manual Verification
- **Visual Check**: Graph renders.
- **Flow**:
    1. "Log in" (Email check).
    2. **Profile Setup**: Enter "CS Major", "Google Intern".
    3. **Import**: Upload mock LinkedIn CSV.
    4. **Visualization**: See the graph build around you.
    5. **Goal**: Search "Tech" -> See relevant nodes glow.
