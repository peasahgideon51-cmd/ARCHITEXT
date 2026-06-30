# Contributing to Architext

Welcome to the Architext project! Please read this guide before making any contributions.

---

## Team Roles & Areas

| Dev | Area | Responsibilities |
|---|---|---|
| 1 | Frontend (React Native) | Screens, navigation, forms, floor plan viewer |
| 2 | UI/UX & Design Systems | Theme tokens, component styles, dark mode, animations |
| 3 | Backend / API | Spring Boot auth, Flask API, PostgreSQL, JWT |
| 4 | AI & Floor Plan Engine | NLP parser, layout engine, adjacency rules, explanation |
| 5 | Visualization & Export | SVG renderer, 3D isometric view, export/share |

---

## Branch Structure

```
main        ← stable, production-ready (protected, PRs only)
└── dev     ← active development (all PRs merge here first, protected)
    ├── feature/frontend-*
    ├── feature/ui-*
    ├── feature/backend-*
    ├── feature/ai-engine-*
    └── feature/visualization-*
```

---

## Branch Naming

Always branch off `dev`, never `main`.

```
feature/<your-area>-<short-description>
```

**Examples:**

- `feature/frontend-history-screen`
- `feature/ui-dark-mode-tokens`
- `feature/backend-jwt-refresh`
- `feature/ai-parser-improvements`
- `feature/visualization-3d-view`

---

## Commit Message Style

```
<type>: <short description>
```

**Types:**

- `feat` — new feature
- `fix` — bug fix
- `style` — UI/styling changes
- `refactor` — code restructure, no functionality change
- `docs` — documentation updates
- `test` — adding or updating tests
- `chore` — maintenance (dependencies, config, gitignore)

**Examples:**

- `feat: add 3D isometric floor plan renderer`
- `fix: resolve JWT token expiry on logout`
- `style: update dark mode card backgrounds`
- `docs: update README with Spring Boot setup`

---

## How to Submit a Pull Request

1. Branch off `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-area-description
   ```

2. Make your changes and commit:

   ```bash
   git add .
   git commit -m "feat: describe what you did"
   ```

3. Push your branch:

   ```bash
   git push origin feature/your-area-description
   ```

4. Go to GitHub and open a **Pull Request** from your branch → `dev`

5. Fill in the PR description:
   - What did you change?
   - Why?
   - Any issues or blockers?

6. Request a review from the project lead before merging.

---

## Running the Project Locally

### All three servers must be running simultaneously

**Terminal 1 — Flask layout engine (port 5000):**
```bash
python app.py
```

**Terminal 2 — Spring Boot backend (port 8080):**
```bash
cd architext-backend
mvn spring-boot:run
```

**Terminal 3 — React Native frontend:**
```bash
cd architext-app
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

### Important: update your local IP

In `architext-app/src/context/AuthContext.tsx` and `architext-app/src/services/api.ts`, replace the IP with your machine's local IP:

```typescript
const BASE_URL = 'http://YOUR_LOCAL_IP:8080';
```

Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your IP.

---

## General Rules

- **Never push directly to `main` or `dev`** — always use a feature branch and PR
- **Pull from `dev` regularly** to stay up to date and avoid merge conflicts
- **One feature per branch** — keep PRs focused and small
- **Don't commit `__pycache__`** — it's in `.gitignore`, keep it that way
- **Don't commit `node_modules`** — never commit this folder
- **Test before pushing** — make sure your changes don't break existing functionality
- **Communicate** — if you're working on something, mention it so no one duplicates work

---

## Key Files by Dev

| Dev | Key files to work in |
|---|---|
| 1 | `architext-app/src/screens/`, `architext-app/src/navigation/AppNavigator.tsx` |
| 2 | `architext-app/src/constants/theme.ts`, `architext-app/src/components/` |
| 3 | `architext-backend/src/`, `app.py` |
| 4 | `parser/`, `layout/`, `explanation/` |
| 5 | `renderer/`, `architext-app/src/screens/HomeScreen.tsx` (3D view block) |

---

*For questions, reach out to the project lead.*
