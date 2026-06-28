# Architext

> *Describe a space. See a floor plan.*

Architext is an AI-powered architectural floor plan generator. Users provide natural language descriptions of spaces and receive to-scale SVG floor plans rendered in 2D, with an interactive 3D isometric view in progress.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native + Expo SDK 54 + TypeScript |
| Backend / Auth | Spring Boot 3.3 (Java 21) + JWT + PostgreSQL |
| Layout Engine | Python / Flask (NLP parser, layout engine, SVG renderer) |
| Database | PostgreSQL 18 |
| Navigation | React Navigation v7 — Stack navigator |
| Storage | AsyncStorage (local), PostgreSQL (user accounts) |

---

## Project Structure

```
ARCHITEXT/
├── architext-app/              ← React Native frontend (Expo SDK 54)
│   ├── App.tsx                 ← Root: fonts, providers, splash, auth gate
│   ├── index.ts                ← Entry point
│   ├── src/
│   │   ├── constants/          ← Design tokens, room colours, example prompts
│   │   ├── context/            ← ThemeContext (dark mode), AuthContext (JWT)
│   │   ├── services/           ← API calls (all traffic → Spring Boot)
│   │   ├── hooks/              ← useHistory, useSaved (AsyncStorage)
│   │   ├── navigation/         ← Stack navigator
│   │   ├── components/         ← Card, Button, Input, DrawerContent
│   │   └── screens/            ← Splash, Login, SignUp, Home, History, Saved, Settings
│
├── architext-backend/          ← Spring Boot backend (port 8080)
│   └── src/main/java/com/architext/
│       ├── controller/         ← AuthController, LayoutController, ParseController
│       ├── service/            ← AuthService, FlaskProxyService
│       ├── security/           ← JwtUtils, JwtAuthFilter, UserDetailsServiceImpl
│       ├── model/              ← User (JPA entity → PostgreSQL)
│       ├── repository/         ← UserRepository
│       ├── dto/                ← SignupRequest, LoginRequest, AuthResponse, ApiResponse
│       └── config/             ← SecurityConfig, GlobalExceptionHandler
│
├── parser/                     ← Dev 4: NLP parser
├── layout/                     ← Dev 4: Layout engine
├── explanation/                ← Dev 4: Explanation generator
├── renderer/                   ← Dev 5: SVG renderer
├── static/                     ← Legacy web frontend (index.html)
├── app.py                      ← Flask server (layout engine, port 5000)
├── requirements.txt
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

---

## Architecture

```
React Native (Expo Go)
        │
        │  All requests → port 8080
        ▼
┌─────────────────────────┐
│   Spring Boot (8080)    │
│  • JWT auth             │
│  • User management      │
│  • PostgreSQL           │
│  • Proxy → Flask        │
└────────────┬────────────┘
             │ Internal only
             ▼
┌─────────────────────────┐
│   Flask engine (5000)   │
│  • NLP parser           │
│  • Layout engine        │
│  • SVG renderer         │
│  • Explanation module   │
└─────────────────────────┘
```

The React Native client **never** talks to Flask directly. Spring Boot proxies all layout and parse requests internally.

---

## Team Roles

| Dev | Area | Folders / Files |
|---|---|---|
| 1 | Frontend (React Native) | `architext-app/src/screens/`, `architext-app/src/navigation/` |
| 2 | UI/UX & Design | `architext-app/src/components/`, `architext-app/src/constants/theme.ts` |
| 3 | Backend / API | `architext-backend/`, `app.py` |
| 4 | AI & Floor Plan Engine | `parser/`, `layout/`, `explanation/` |
| 5 | Visualization & Export | `renderer/`, 3D view (in progress) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Java 21+
- Maven 3.9+
- PostgreSQL 18
- Expo Go (on your phone)

### 1. Clone the repo

```bash
git clone https://github.com/peasahgideon51-cmd/ARCHITEXT.git
cd ARCHITEXT
git checkout dev
```

### 2. Create your feature branch

```bash
git checkout -b feature/your-area-description
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up PostgreSQL

```sql
CREATE DATABASE architext;
```

Update the password in `architext-backend/src/main/resources/application.properties`:
```properties
spring.datasource.password=YOUR_PASSWORD
```

### 5. Start all three servers

**Terminal 1 — Flask engine:**
```bash
python app.py
```

**Terminal 2 — Spring Boot:**
```bash
cd architext-backend
mvn spring-boot:run
```

**Terminal 3 — Expo (React Native):**
```bash
cd architext-app
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

### 6. Update the backend URL

In `architext-app/src/context/AuthContext.tsx` and `architext-app/src/services/api.ts`, set `BASE_URL` / `DEFAULT_BASE` to your machine's local IP address on port 8080:

```typescript
const BASE_URL = 'http://YOUR_LOCAL_IP:8080';
```

Find your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for branch rules, commit message style, and how to submit pull requests.

---

*For questions, reach out to the project lead.*
