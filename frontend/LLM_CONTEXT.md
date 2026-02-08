# Frontend Context for LLMs

## Tech Stack
- **Core**: React 19, Vite, JavaScript (ESModules).
- **Styling**: Tailwind CSS (`index.css` contains base directives).
- **Visualization**: `react-force-graph-2d`, `react-force-graph-3d`, `three.js`.
- **Icons**: `lucide-react`.
- **Data Parsing**: `papaparse` (for CSV imports).

## Architecture & State
- **No Global Store**: Currently uses local state (`useState`, `useEffect`) lifted to `App.jsx` where necessary.
- **API Layer**: All HTTP calls flow through `src/services/api.js`. Do not use `fetch` directly in components.
- **Environment**: Strict dependency on `VITE_API_URL` (checked at runtime).

## Key Files & patterns
- **`src/config/graphConfig.js`**: **CRITICAL**. This is the single source of truth for:
    - Node colors (Emerald=Self, Amber=Friend).
    - Zoom levels and camera behavior.
    - Score thresholds for visual effects (auras, labels).
    - *Always check this file before hardcoding any visual properties.*
- **`src/components/Graph/GraphViz.jsx`**: The main wrapper for the graph. Handles the toggle between 2D/3D modes and event listeners (node clicks).
- **`src/data/mockData.js`**: Legacy mock data generator. Moving towards real backend data, but still used for fallbacks.

## Development Rules
1. **Tailwind First**: Use utility classes over custom CSS.
2. **Icons**: Use `lucide-react` for all icons.
3. **Graph Interactions**: When adding interactions, ensure they work in both 2D and 3D modes if possible.
