# ARCHITEXT

## Project Overview

Architext is a school project focused on architectural floor plan generation and visualization. It is built using Python (Flask) and uses a modular structure for parsing, layout generation, and rendering.

---

## Folder Structure

```
ARCHITEXT/
├── static/
│   ├── css/        ← Dev 2 (UI/UX & Design Systems)
│   │   └── style.css
│   └── js/         ← Dev 1 (Frontend Development)
│       └── script.js
│   └── index.html  ← Dev 1 (Frontend Development)
├── parser/         ← Dev 4 (AI & Floor Plan Engine)
├── layout/         ← Dev 4 (AI & Floor Plan Engine)
├── explanation/    ← Dev 4 (AI & Floor Plan Engine)
├── renderer/       ← Dev 5 (Visualization & Export)
├── app.py          ← Dev 3 (Backend/API Development)
├── requirements.txt
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

---

## Team Roles

| Dev | Area                    | Folders/Files                        |
| --- | ----------------------- | ------------------------------------ |
| 1   | Frontend Development    | `static/js/`, `static/index.html`    |
| 2   | UI/UX & Design Systems  | `static/css/`                        |
| 3   | Backend/API Development | `app.py`                             |
| 4   | AI & Floor Plan Engine  | `parser/`, `layout/`, `explanation/` |
| 5   | Visualization & Export  | `renderer/`                          |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/peasahgideon51-cmd/ARCHITEXT.git
cd ARCHITEXT
```

### 2. Switch to the `dev` branch

```bash
git checkout dev
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create your feature branch

Always branch off `dev`, never `main`:

```bash
git checkout -b feature/your-area-description
```

**Examples:**

- `feature/frontend-dashboard-layout`
- `feature/ui-component-library`
- `feature/backend-auth-endpoint`
- `feature/ai-room-parser`
- `feature/visualization-svg-export`

### 5. Run the app locally

```bash
python app.py
```

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for branch rules, commit message style, and how to submit pull requests.

---

_For questions, reach out to the project leader._
