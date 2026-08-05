# Architext

AI-powered architectural floor plan generator. Describe a space in natural language and Architext generates a floor plan, rendered as SVG with both 2D and 3D visualization.

Built as a school group project (team of five), with the system design, backend, ML/layout service, deployment, and mobile app owned end-to-end by the lead developer.

---

## Overview

Architext takes a natural language description of a space (e.g. *"a 3-bedroom apartment with an open kitchen and a balcony off the living room"*) and produces:

- A generated floor plan layout
- An SVG rendering of the plan
- 2D and 3D visualization in the mobile app
- Saveable plan history per user, behind authentication
- Export to PNG, SVG, or PDF

---

## Architecture

Architext is split into three services plus a database:

| Service | Role | Stack |
|---|---|---|
| **Mobile app** | UI, 2D/3D rendering, auth flows | React Native / Expo SDK 54, TypeScript |
| **Backend (`architext-backend`)** | Auth (JWT), user history, saved plans, API proxying | Spring Boot, Java 21 |
| **Layout service (`architext-flask` / ML service)** | NLP parsing, layout generation, SVG rendering | Python, Flask |
| **Database** | Persistent storage | PostgreSQL |

### Request flow

- **Auth, history, saved plans** → Mobile app → Spring Boot → PostgreSQL
- **Layout generation** → Mobile app → Flask directly (see note below)

> **Note on the layout generation path:** Ideally, all requests route through Spring Boot, which proxies to Flask over a private network. Render's free tier doesn't support private networking between services, so Flask is exposed as a public service and secured with a shared-secret `X-Internal-Key` header. Separately, there's an unresolved issue where Spring Boot's outbound `RestTemplate` call to Flask fails silently in production (suspected OOM on the 512MB container — mitigated with `JAVA_TOOL_OPTIONS=-Xmx350m`, but not fully root-caused). As a workaround, the mobile app calls the Flask layout endpoint directly using the `X-Internal-Key` header, bypassing the Spring Boot proxy for that one flow only. This has been verified working reliably end-to-end on a real build/device. This is flagged for follow-up — see [Known Issues](#known-issues--roadmap).
>
> **Operational gotcha:** the `X-Internal-Key` value is currently hardcoded client-side in `api.ts` rather than read from env config. If this key is ever rotated on the Flask/Render side without also rebuilding and reinstalling the mobile app, every layout generation request will fail with an `Unauthorized` response — the app is still running against a stale key baked into the old build. This has already happened once during testing; see [Known Issues](#known-issues--roadmap) for the planned fix (move to env-based config).

---

## Live Deployment

| Service | URL |
|---|---|
| Backend (Spring Boot) | `https://architext-backend-3hdd.onrender.com` |
| Layout service (Flask) | `https://architext-flask.onrender.com` |

Both are hosted on Render's free tier and monitored by UptimeRobot (pinging `/actuator/health` and `/health` every 10 minutes) to mitigate cold starts.

**Cold start note:** Render free tier spins down services after 15 minutes of inactivity. Spring Boot in particular has a slow cold start (~118s) due to JVM startup on a 512MB container.

**Mobile build:** Android APK built via EAS Build (`preview` profile, internal distribution) — confirmed built, installed, and tested end-to-end on a physical device, including auth, layout generation, save/bookmark, and history flows.

---

## Tech Stack Details

**Frontend**
- React Native / Expo SDK 54, TypeScript
- `react-native-svg` for SVG rendering and rasterization
- Three.js (r128, WebView-embedded) for 3D visualization
- `expo-file-system/legacy`, `expo-sharing`, `expo-media-library` for export/save-to-photos flows
- `expo-print` (pinned to `15.0.8`) for PDF export — confirmed working end-to-end
- Export formats: PNG, SVG, and PDF, selectable in Settings

**Backend**
- Spring Boot, Java 21
- Lombok (`@Getter`, etc.) — configured with `optional=true` in `pom.xml`, excluded from the final jar via the Spring Boot Maven plugin
- JWT-based authentication
- `spring-dotenv` (`me.paulschwarz`, v4.0.0) for `.env` loading

**Layout / ML service**
- Python, Flask
- NLP parsing of natural language descriptions into structured layout requests
- SVG rendering with a dynamic grid sizing system (16px padding between cells — adjacency logic uses grid-slot comparison rather than pixel distance)
- Named style presets (Traditional, Open-Plan, Compact, Spacious) parameterizing grid aspect ratio, adjacency constraints, and outdoor emphasis

**Database**
- PostgreSQL (hosted on Render)

---

## Project Structure

```
ARCHITEXT/
├── architext-app/        # React Native / Expo mobile app
├── architext-backend/    # Spring Boot backend (auth, history, proxying)
│   └── .env              # not committed — see Environment Variables
└── architext-flask/      # Flask layout/ML service (adjust to actual folder name)
```

*(`layout_engine.py` exists as a single file at the project root — an earlier apparent duplicate was confirmed to be a stale VS Code tab, not a second file on disk.)*

---

## Getting Started (Local Development)

> These are the general steps based on the current architecture — confirm exact scripts/commands against your local `package.json` and `pom.xml` before publishing.

### Prerequisites
- Node.js + npm/yarn
- Java 21 + Maven
- Python 3.x + pip
- PostgreSQL (local instance or connection to a hosted instance)
- Expo CLI / Expo Go app for mobile testing

### Backend (Spring Boot)
```bash
cd architext-backend
# create a .env file with required variables (see below)
mvn spring-boot:run
```

### Layout service (Flask)
```bash
cd architext-flask
pip install -r requirements.txt
python app.py
```

### Mobile app (Expo)
```bash
cd architext-app
npm install
npx expo start
```

---

## Environment Variables

Backend `.env` (loaded via `spring-dotenv`, not committed to git):

```
DB_URL=****
DB_USERNAME=****
DB_PASSWORD=****
JWT_SECRET=****
ARCHITEXT_INTERNAL_KEY=****
```

Flask service expects the matching `X-Internal-Key` value to authenticate requests from the backend/mobile app.

---

## Known Issues & Roadmap

Deferred post-defense, tracked for future work:

- [ ] Root-cause the Spring Boot → Flask proxy failure (confirm OOM vs. other cause; consider a paid Render tier or JVM tuning) and remove the direct-to-Flask workaround
- [ ] Move `X-Internal-Key` out of hardcoded client-side value in `api.ts` into env-based config, to prevent silent key drift between builds and the Flask service
- [ ] Tighten CORS — currently `setAllowedOriginPatterns(List.of("*"))` in `SecurityConfig.java`; remove the dead, unwired `architext.cors.allowed-origins` property or wire it in properly
- [ ] Set up CI/CD via GitHub Actions
- [ ] Replace `ddl-auto=update` with Flyway migrations
- [ ] Apple Developer Program enrollment (Individual) for iOS distribution
- [ ] Full API and deployment documentation
- [ ] Remove/isolate Flask's legacy `flask_login` / SQLite auth remnants (Spring Boot JWT is the sole auth boundary in production)
- [ ] Docker Compose setup for local multi-service development
- [ ] CONTRIBUTING.md

**Recently resolved:**
- [x] Confirm EAS Android APK build and test install — built, installed on physical device, and verified across auth, layout generation, save, and history flows
- [x] PDF export confirmed working end-to-end (via `expo-print@15.0.8`)
- [x] Confirmed no duplicate `layout_engine.py` file exists

---

## Contributing

This project uses `main` and `dev` branches with branch protection requiring pull requests. Open a PR against `dev` for review.

---
