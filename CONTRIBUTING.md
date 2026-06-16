# Contributing to Architext

Welcome to the Architext project! Please read this guide before making any contributions.

---

## Team Roles & Areas

| Dev | Area                    | Responsibilities                                        |
| --- | ----------------------- | ------------------------------------------------------- |
| 1   | Frontend Development    | Web pages, forms, navigation, dashboards, design viewer |
| 2   | UI/UX & Design Systems  | Colors, typography, animations, component library       |
| 3   | Backend/API Development | Flask APIs, authentication, database, business logic    |
| 4   | AI & Floor Plan Engine  | NLP parser, layout engine, optimization algorithms      |
| 5   | Visualization & Export  | SVG renderer, 3D models, BIM/CAD export, PDF export     |

---

## Branch Structure

```
main        ← stable, production-ready (protected, no direct pushes)
└── dev     ← active development (all PRs merge here first)
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

- `feature/frontend-dashboard-layout`
- `feature/backend-auth-endpoint`
- `feature/ai-room-parser`
- `feature/ui-component-library`
- `feature/visualization-svg-export`

---

## Commit Message Style

Use clear, descriptive commit messages:

```
<type>: <short description>
```

**Types:**

- `feat` – new feature
- `fix` – bug fix
- `style` – UI/styling changes
- `refactor` – code restructure, no functionality change
- `docs` – documentation updates
- `test` – adding or updating tests

**Examples:**

- `feat: add floor plan grid renderer`
- `fix: resolve auth token expiry bug`
- `style: update dashboard color scheme`
- `docs: update API endpoint documentation`

---

## How to Submit a Pull Request (PR)

1. Make sure you are branched off `dev`:

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

## General Rules

- **Never push directly to `main` or `dev`** — always use a feature branch and PR
- **Pull from `dev` regularly** to stay up to date and avoid merge conflicts
- **One feature per branch** — keep PRs focused and small
- **Communicate** — if you're working on something, mention it so no one duplicates work
- **Test before pushing** — make sure your changes don't break existing functionality

---

## Getting Started

1. Clone the repo:

   ```bash
   git clone https://github.com/your-username/architext.git
   ```

2. Switch to the `dev` branch:

   ```bash
   git checkout dev
   ```

3. Install dependencies and run the project locally (see `README.md` for setup instructions)

---

_For questions, reach out to the project lead._
