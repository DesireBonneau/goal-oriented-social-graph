# Project Context & AI Guidelines

## 🌟 Vision: Goal-Oriented Social Graph
This project is a social networking platform designed for university students (initially McGill). Unlike traditional networks (Facebook/LinkedIn) that connect based on *who you know*, this platform connects students based on **shared goals** and **academic paths**.

**Key Value Proposition:**
- "I want to found a startup" -> Connects with other aspiring founders.
- "I want to pass COMP 250" -> Connects with study buddies.
- Visualized as an interactive 2D/3D Graph.

## 📚 Documentation Index
Use these files as your primary source of truth for specific domains.

| Domain | Documentation | AI Context & Patterns |
| :--- | :--- | :--- |
| **Frontend** | [README](./frontend/README.md) | [**LLM_CONTEXT.md**](./frontend/LLM_CONTEXT.md) |
| **Backend** | [README](./backend/README.md) | [**LLM_CONTEXT.md**](./backend/LLM_CONTEXT.md) |
| **Roadmap** | [ROADMAP.md](./ROADMAP.md) | -- |

## 🤖 Directives for AI Agents
**CRITICAL**: As an AI contributor, you are responsible for maintaining the documentation.

1.  **Schema Changes**: If you modify the MongoDB schema (e.g., adding a field to `users`), you **MUST** update `backend/LLM_CONTEXT.md` to reflect the new structure.
2.  **State Management**: If you introduce a global store (Redux/Zustand) or change how API calls are handled in the frontend, you **MUST** update `frontend/LLM_CONTEXT.md`.
3.  **New Patterns**: If you introduce a new pattern (e.g., "All forms must use `react-hook-form`"), document it in the relevant Context file.

**Rule of Thumb**: Leave the context cleaner than you found it. Future agents will rely on your updates.
