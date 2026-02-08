# Frontend Documentation

## Overview
This is a **React + Vite** application styled with **Tailwind CSS**. It serves as the user interface for the Goal-Oriented Social Graph.
It includes **User Authentication**, **Guest Bypass**, and **Resume Parsing** features.

## Structure
- `src/components/`: Reusable UI components.
    - `Graph/`: 2D/3D Graph visualization logic (`react-force-graph`).
    - `Onboarding/`: Auth (Login/Register/Guest) and Data Import flows.
    - `UI/`: Generic atoms (Buttons, SearchBars).
- `src/data/`: Mock data generators (legacy/fallback).
- `src/services/`: API clients (`api.js`).
- `src/utils/`: Helper functions.

## Setup & Run

### 1. Environment
Ensure you have the correct Node version:
```bash
nvm use
# or
cat .nvmrc
```

Create a `.env` file:
```bash
VITE_API_URL=http://localhost:5000/api
```

### 2. Commands
| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (Default port 5173) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm test` | *Coming Soon* (Vitest setup pending) |

## Testing
We use **Vitest** (compatible with Jest).
*(Note: Test setup is currently basic. See `src/data/mockData.test.js` for examples).*
