# CoachLab Fútbol

A web application for amateur and grassroots football coaches: manage your squad,
record match results and analyse team performance through statistical indicators
(the **IRE** index), with **coach** and **scout** roles.

**🌐 Live application:** https://coachlab-futbol-ui5w.onrender.com/

**🔑 Demo accounts** (password `coachlab123` for all of them):

| Email | Role | Data |
|---|---|---|
| `entrenador1@coachlab.test` | Coach (entrenador) | Team with 15 players and registered matches |
| `entrenador2@coachlab.test` | Coach (entrenador) | Team with 18 players and registered matches |
| `ojeador@coachlab.test` | Scout (ojeador) | Compares squads from the app and the API |

> **Note:** the backend runs on Render's free tier. The first request after a period
> of inactivity may take ~30 s while the container wakes up.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Local Development](#local-development)
7. [Project Structure](#project-structure)
8. [REST API](#rest-api)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Documentation](#documentation)
12. [Future Improvements](#future-improvements)

---

## Overview

Professional clubs have access to advanced analytics platforms (Wyscout, InStat…),
but these are expensive and overly complex for a regional or youth coach. Most
amateur coaches resort to spreadsheets or paper notes, resulting in fragmented data
and no analytical insight.

CoachLab fills this gap with a simple, browser-based platform that delivers real
statistical value without requiring technical expertise. Its core metric is the
**IRE (Índice de Rendimiento del Equipo)**, a composite performance index computed
from match results and goal difference, normalised to a 0–10 scale.

The application is deployed on **Render** (frontend + backend) with a **MySQL**
database managed on **Aiven**, and is built and shipped through a **CI/CD** pipeline
based on GitHub Actions and Docker Hub.

---

## Features

| Feature | Description |
|---|---|
| Authentication & roles | Stateless JWT with two roles: **ENTRENADOR** (manages the squad) and **OJEADOR** (read-only, compares squads). |
| Team management | Create a team manually or import it from the football-data.org API. |
| Squad management | Player CRUD with validation (dorsal 1–99, alphabetic names only, positive age). |
| Match registration | Both teams' scoreline and per-player statistics: goals, assists, minutes, starts and cards. |
| Analytics dashboard | KPI cards, IRE index, recent-form streak and season performance chart. |
| Player impact ranking | Player ranking aggregated from their match statistics. |
| Pre-match / line-up | The coach designs the starting eleven and checks win/draw/loss probabilities. |
| Comparator (scout) | Compares two squads side by side: app teams and football-data API teams. |
| FD import | Imports professional teams and their recent matches (real scoreline) as registered matches. |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Angular (SPA, standalone components) | 21 |
| Web server | Nginx | Alpine |
| Backend | Spring Boot | 3.4.1 |
| Application server | Tomcat (embedded) | — |
| Database | MySQL 8 (prod/Docker, Aiven) · H2 (tests only) | — |
| API documentation | springdoc-openapi (Swagger UI) | 2.7 |
| Containerisation | Docker + Docker Compose | 24+ |
| CI/CD | GitHub Actions + Docker Hub | — |
| Hosting | Render.com (app) + Aiven (MySQL) | — |
| External data | football-data.org API | v4 |

**Frontend:** Angular Router, HttpClient with a JWT interceptor, SCSS design tokens,
CSS animations (`@keyframes`, `IntersectionObserver`), Outfit and Inter typefaces.

**Backend:** Spring Security (JWT, ENTRENADOR/OJEADOR roles), JJWT, Spring Data JPA,
MySQL Connector, Spring WebFlux (WebClient for the BFF proxy), Spring Boot Actuator,
springdoc-openapi.

---

## Architecture

CoachLab follows a three-layer client-server architecture, containerised with Docker.
**Locally** the whole stack is started with Docker Compose; **in production** it runs
on Render (frontend + backend) with Aiven (MySQL).

### Production (Render + Aiven)

```
                Internet (HTTPS)
                      |
        +-------------+-------------+
        |                           |
        v                           v
+-------------------+      +----------------------+
| Frontend          |      | Backend              |
| Render Static Site|      | Render Web Service   |
| Angular (SPA)     | ---> | Spring Boot (Docker) |
| rewrite /* →      | /api | REST + JWT + IRE     |
| index.html        |      | football-data proxy  |
+-------------------+      +----------+-----------+
                                      | JDBC (SSL)
                                      v
                           +----------------------+
                           |  MySQL 8 (Aiven)     |
                           +----------------------+
```

> The frontend is a Render **Static Site** with a rewrite rule `/* → /index.html`
> (required for the SPA's client-side routing). The backend is a **Web Service**
> running the Docker image published to Docker Hub.

### Local (Docker Compose)

```
+------------------------------------+
|  Frontend — Angular + Nginx :80    |
|  Serves the SPA and reverse-proxies|
|  /api/* → backend:8080             |
+------------------------------------+
                |  (internal bridge network)
                v
+------------------------------------+
|  Backend — Spring Boot :8080       |
+------------------------------------+
                |  JDBC
                v
+------------------------------------+
|  MySQL 8 (Docker volume db-data)   |
+------------------------------------+
```

**Network isolation:** in Docker Compose both containers run on a private bridge
network (`internal`); the backend exposes no port to the host — all traffic enters
through Nginx on port 80.

**Entity model:**

```
USUARIO 1 --- N EQUIPO 1 --- N JUGADOR
                   |                \
                   1                 N
                   |                  \
                   N                   1
                PARTIDO 1 ----------- N ESTADISTICA_JUGADOR
```

**IRE formula:**

```
score_results = (wins×3 + draws×1) / (matches×3)
goal_diff     = clamp((avg_goals_for − avg_goals_against) / 3, −1, 1)
IRE           = clamp((score_results×0.7 + goal_diff×0.3 + 0.3)×10, 0, 10)
```

A value between 0 and 10. Above 8 indicates excellent performance; below 2, very poor.

---

## Getting Started

### Prerequisites

| Tool | Minimum version | Required for |
|---|---|---|
| Git | 2.x | Cloning the repository |
| Docker + Docker Compose | 24.x / 2.x | Running the full application |
| Node.js | 20.x | Frontend development only |
| Java JDK | 17 | Backend development only |
| Maven | 3.9 | Backend development only |

A [football-data.org](https://www.football-data.org/) API key is optional: without it
the API import feature is disabled, but manual team creation works the same.

### Quick start with Docker Compose

```bash
# 1. Clone
git clone https://github.com/JoseAntonioDiazBusati/coachlab-futbol.git
cd coachlab-futbol

# 2. Environment variables (copy the template and fill it in)
cp .env.example .env
#   JWT_SECRET, FD_API_KEY, DB_USER, DB_PASSWORD, MYSQL_ROOT_PASSWORD...

# 3. Build and start (MySQL + backend + frontend)
docker compose up --build

# 4. Open
#    Frontend: http://localhost
#    Backend API reachable through Nginx at http://localhost/api

# 5. Stop
docker compose down       # keeps the database volume
docker compose down -v    # also removes the volume
```

Quick verification:

```bash
docker compose ps                        # service status
curl -i http://localhost/api/auth/login  # backend responds through Nginx
```

---

## Local Development

### Backend

The application always uses **MySQL**. Tests use an in-memory H2 database; to run the
app locally, use the `local` profile pointing at a MySQL instance (from Docker Compose
or a managed one such as Aiven), configured in an `application-local.properties` file
(git-ignored):

```bash
cd backend/coachlab-springboot/coachlab

# Copy the template and fill in DB_URL/user/password + secrets:
cp src/main/resources/application-local.properties.example \
   src/main/resources/application-local.properties

# Run with the local profile
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

- API: `http://localhost:8080/api`
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- Tests (in-memory H2): `mvn test`

### Frontend

```bash
cd frontend
npm ci         # reproducible install
npm start      # dev server at http://localhost:4200 (proxies /api)
npm test       # unit tests (Vitest)
npm run build  # production build
```

---

## Project Structure

```
coachlab-futbol/
├── backend/coachlab-springboot/coachlab/
│   ├── src/main/java/com/coachlab/coachlab/
│   │   ├── controller/   REST controllers (Auth, Equipo, Jugador, Partido, FD, Explorar)
│   │   ├── service/      Business logic (Analysis/IRE, Auth, Explorar...)
│   │   ├── model/        JPA entities
│   │   ├── repository/   Spring Data JPA repositories
│   │   ├── security/     JWT filter, SecurityConfig, roles
│   │   ├── dto/          Data Transfer Objects + validation
│   │   └── config/       OpenAPI configuration
│   ├── src/test/java/...  JUnit + MockMvc tests
│   ├── Dockerfile        Multi-stage (Maven build + JRE Alpine)
│   └── pom.xml
├── frontend/
│   ├── src/app/
│   │   ├── components/   Components (auth, dashboard, squad, matches, comparator...)
│   │   ├── services/     HTTP services, interceptor and guards
│   │   └── design/       Global SCSS tokens
│   ├── Dockerfile        Multi-stage (Node build + Nginx Alpine)
│   ├── nginx.conf        Production Nginx (SPA fallback + cache + headers)
│   └── nginx.local.conf  Local Nginx (SPA fallback + reverse proxy to backend)
├── docs/                 Full project documentation (01–10 + deployment)
├── .github/workflows/    GitHub Actions pipelines (test.yml and docker-image.yml)
├── docker-compose.yml    Local orchestration (mysql + backend + frontend)
├── render.yaml           Render service definitions
└── .env.example          Environment variable template
```

---

## REST API

Every endpoint is prefixed with `/api`. Protected endpoints require the
`Authorization: Bearer <token>` header. The contract is browsable in **Swagger UI**
(`/swagger-ui.html`), with an *Authorize* button to test with a JWT.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Sign up (optional `rol` field: ENTRENADOR/OJEADOR) |
| POST | `/api/auth/login` | Public | Login; returns `{ token, email, nombre, rol }` |

### Teams

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/equipos` | Authenticated | Teams of the authenticated user |
| POST | `/api/equipos` | **ENTRENADOR** | Create a team |
| GET/PUT/DELETE | `/api/equipos/{id}` | Auth. / **ENTRENADOR** | Detail / update / delete |
| GET | `/api/equipos/{id}/ire` | Authenticated | Team IRE |
| GET | `/api/equipos/{id}/resumen` | Authenticated | Season KPI summary |
| GET | `/api/equipos/{idLocal}/prediccion/{idVisitante}` | Authenticated | Match probabilities |

### Players

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/jugadores` | Authenticated | Squad |
| GET | `/api/equipos/{id}/jugadores/ranking` | Authenticated | Impact ranking |
| POST/PUT/DELETE | `/api/equipos/{id}/jugadores/{jId}` | **ENTRENADOR** | Create / update / delete |

### Matches

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/partidos` | Authenticated | List |
| POST | `/api/equipos/{id}/partidos/full` | **ENTRENADOR** | Create match + statistics |
| GET | `/api/equipos/{id}/partidos/{pId}` | Authenticated | Detail with statistics |
| GET | `/api/equipos/{id}/partidos/{pId}/estadisticas` | Authenticated | Match statistics |
| PUT/DELETE | `/api/equipos/{id}/partidos/{pId}` | **ENTRENADOR** | Update / delete |
| GET | `/api/equipos/{id}/partidos/preview-fd` | Authenticated | Editable preview of an FD match |

### Comparator / exploration (OJEADOR role or any authenticated user, read-only)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/explorar/equipos` | Authenticated | All app teams (to compare) |
| GET | `/api/explorar/equipos/{id}/jugadores` | Authenticated | Squad/ranking of any team |

### football-data.org proxy (BFF — the API key never leaves the server)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/fd/competiciones` | Available competitions |
| GET | `/api/fd/competiciones/{code}/equipos` | Teams in a competition |
| GET | `/api/fd/teams/{id}` | Professional team squad |
| GET | `/api/fd/teams/{id}/matches` | Recent matches of the team |
| GET | `/api/fd/competiciones/{code}/scorers` | Top scorers |

**HTTP codes and error format**

```json
{ "timestamp": "2026-06-08T10:30:00", "error": "Unauthorized", "mensaje": "Email o contraseña incorrectos" }
```

| Code | Scenario |
|---|---|
| 200 / 201 / 204 | Successful operation |
| 400 | Invalid data / validation failure |
| 401 | Missing/expired JWT or wrong credentials |
| 403 | Insufficient permissions (e.g. a scout trying to write) |
| 404 | Resource not found or not owned by the user |
| 409 | Conflict (e.g. duplicate email on registration) |

**Example (curl):**

The frontend (Static Site) is served at `coachlab-futbol-ui5w.onrender.com`; the REST API
is the separate backend service (`coachlab-futbol.onrender.com/api`):

```bash
# Login → get token
curl -s -X POST https://coachlab-futbol.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"entrenador1@coachlab.test","password":"coachlab123"}'

# Use the token
curl -s https://coachlab-futbol.onrender.com/api/equipos \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Testing

### Backend (33 tests)

JUnit 5, Spring Boot Test (`@SpringBootTest`), **MockMvc** for controller tests and
**in-memory H2** as the test database. They cover, among others:

- Login/registration and HTTP codes (200/401/409) — `AuthControllerTest`.
- Owner isolation: accessing another user's resources → 404 — `JugadorServiceTest`, `PartidoServiceTest`.
- Roles: the scout cannot write (403) and can compare (200) — `RolesSecurityTest`.
- Match-with-statistics flow, IRE and FD mapping.

```bash
cd backend/coachlab-springboot/coachlab && mvn test
```

### Frontend (224 tests)

**Vitest** + Angular TestBed (`*.spec.ts` co-located with each component/service).

```bash
cd frontend && npm test
```

### CI

- **`test.yml`** runs both suites on every *pull request* to `main`.
- **`docker-image.yml`** builds and publishes the Docker images on every *push* to `main`.

---

## Deployment

### Infrastructure

| Service | Type | URL / target |
|---|---|---|
| Frontend | Render **Static Site** (rewrite `/* → /index.html`) | https://coachlab-futbol-ui5w.onrender.com/ |
| Backend | Render **Web Service** (Docker image) | image `joseantoniodiazbusati/coachlab-backend:latest` |
| Database | **Aiven** MySQL 8 (managed, SSL) | `DB_URL` with `sslMode=REQUIRED` |
| Image registry | Docker Hub | `joseantoniodiazbusati/coachlab-{backend,frontend}` |

### CI/CD (GitHub Actions)

```
Pull request → main      Push → main
      |                       |
   test.yml              docker-image.yml
   ├─ test-frontend      ├─ docker-backend  (build + push :latest)
   └─ test-backend       ├─ docker-frontend (build + push :latest)
                         └─ deploy          (Render webhooks, optional)
```

**GitHub secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (and optionally
`RENDER_DEPLOY_HOOK_BACKEND` / `RENDER_DEPLOY_HOOK_FRONTEND`).

### Backend environment variables (Render)

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (the image already defaults to it) |
| `DB_URL` | Full Aiven JDBC string (`jdbc:mysql://...:port/defaultdb?sslMode=REQUIRED&serverTimezone=UTC`) |
| `DB_USER` / `DB_PASSWORD` | Aiven credentials |
| `JWT_SECRET` | Random string ≥ 32 characters |
| `FD_API_KEY` | football-data.org API key |
| `COACHLAB_CORS_ALLOWED_ORIGINS` | Public frontend URL |
| `COACHLAB_SEED_DEMO` | `true` to seed the three demo users |

The full deployment module (architecture, Docker, reverse proxy, CI/CD and evidence)
is documented in [docs/08-despliegue.md](docs/08-despliegue.md) and
[docs/despliegue.md](docs/despliegue.md).

---

## Documentation

All project documentation lives in `docs/`:

| File | Contents |
|---|---|
| [01-introduccion.md](docs/01-introduccion.md) | Origin, objectives and comparison with similar tools |
| [02-descripcion.md](docs/02-descripcion.md) | Feature descriptions, UI/UX and use cases |
| [03-instalacion.md](docs/03-instalacion.md) | Prerequisites, environment variables and installation |
| [04-guia-estilos.md](docs/04-guia-estilos.md) | Palette, typography, spacing and components |
| [05-diseno.md](docs/05-diseno.md) | ER diagram, use cases, flows, architecture and API design |
| [06-desarrollo.md](docs/06-desarrollo.md) | Development sequence, technical decisions and difficulties |
| [07-pruebas.md](docs/07-pruebas.md) | Methodology, test types, coverage and results |
| [08-despliegue.md](docs/08-despliegue.md) | Deployment, CI/CD and configuration |
| [09-manual-usuario.md](docs/09-manual-usuario.md) | Step-by-step user manual |
| [10-conclusiones.md](docs/10-conclusiones.md) | Critical evaluation, scope fulfilment and lessons learned |

---

## Future Improvements

- Versioned database migrations (Flyway/Liquibase) and `ddl-auto=validate` in production.
- Password recovery by email.
- Multiple teams per coach.
- PDF/CSV export of summaries and squads.
- Per-player statistics on API imports (requires a paid plan).

---

## License

Academic project for the Desarrollo de Aplicaciones Web (DAW) programme. Not licensed for commercial use.
