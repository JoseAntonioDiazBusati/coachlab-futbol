# CoachLab Futbol

A web application for amateur and grassroots football coaches to manage their squad, record match results, and analyse team performance through statistical indicators.

**Production:** https://coachlab-futbol-eeiq.onrender.com

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Local Development](#local-development)
7. [Project Structure](#project-structure)
8. [API Reference](#api-reference)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Documentation](#documentation)
12. [Future Improvements](#future-improvements)

---

## Overview

Professional clubs have access to advanced analytics platforms such as Wyscout or InStat, but these are prohibitively expensive and overly complex for a regional or youth coach. Most amateur coaches resort to spreadsheets or paper notes, resulting in fragmented data and no analytical insight.

CoachLab fills this gap by providing a simple, browser-based platform that offers real statistical value without requiring technical expertise. Its core metric is the **IRE (Indice de Rendimiento del Equipo)**, a composite performance index calculated from match results and goal difference, normalised to a 0-10 scale.

The application requires no installation and runs in any modern browser. It is deployed on Render using two containerised services and a fully automated CI/CD pipeline.

---

## Features

| Feature | Description |
|---|---|
| Authentication | JWT-based stateless authentication — register, login, and logout |
| Team setup | Create a team manually or import from the football-data.org API |
| Squad management | Full CRUD for players: position, dorsal, age, and photo |
| Match registration | Record results and per-player statistics (goals, assists, cards) |
| Dashboard | KPI cards, IRE index, recent form streak, and season performance chart |
| Match prediction | Win/draw/loss probabilities based on comparative IRE between two teams |
| Liga browser | Browse professional competitions and clubs via football-data.org |
| Player impact ranking | Composite ranking aggregated from individual match statistics |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Angular (SPA) | 19 |
| Web server | Nginx | Alpine |
| Backend | Spring Boot | 3.4.1 |
| Application server | Tomcat (embedded) | — |
| Database | H2 (file persistence) | — |
| Containerisation | Docker + Docker Compose | 24+ |
| CI/CD | GitHub Actions | — |
| Cloud hosting | Render.com | — |
| External data | football-data.org API | v4 |

**Frontend:** Angular Router, Angular HTTP Client, SCSS design tokens, Outfit and Inter typefaces via Google Fonts.

**Backend:** Spring Security, JJWT, Spring Data JPA, Spring WebFlux (WebClient), Spring Boot Actuator, H2 database engine.

---

## Architecture

CoachLab follows a three-layer client-server architecture, fully containerised with Docker.

```
Internet
    |
    | HTTPS :443 / HTTP :80
    v
+------------------------------------+
|  Frontend — Angular + Nginx        |
|  Serves SPA static files           |
|  Proxies /api/* to backend         |
+------------------------------------+
    |
    | HTTP :8080  (internal Docker bridge network)
    v
+------------------------------------+
|  Backend — Spring Boot             |
|  REST API, JWT auth, IRE formula   |
|  Proxies requests to football-data |
+------------------------------------+
    |
    | JDBC (file)
    v
+------------------------------------+
|  H2 Database                       |
|  Docker volume: db-data            |
|  /data/coachlabdb.mv.db            |
+------------------------------------+
```

**Network isolation:** Both containers run on a private bridge network (`internal`). The backend exposes no port to the host — all external traffic enters through Nginx on port 80.

**Environment differences:**

| Environment | API routing | Angular config |
|---|---|---|
| Local (`ng serve`) | Angular proxy via `proxy.conf.json` | `environment.ts` |
| Local Docker Compose | Nginx reverse proxy: `/api/` to `http://backend:8080` | `environment.docker.ts` |
| Production (Render) | Direct URL: `https://coachlab-futbol.onrender.com/api` | `environment.prod.ts` |

**Entity model:**

```
USUARIO 1 --- N EQUIPO 1 --- N JUGADOR
                   |
                   1 --- N PARTIDO 1 --- N ESTADISTICA_JUGADOR
                                             |
                                       N --- 1 JUGADOR
```

**IRE formula:**

```
score_results = (wins x 3 + draws x 1) / (total_matches x 3)
goal_diff     = clamp((avg_goals_for - avg_goals_against) / 3, -1, 1)
IRE           = clamp((score_results x 0.7 + goal_diff x 0.3 + 0.3) x 10, 0, 10)
```

The result is a value between 0 and 10, rounded to two decimal places. A score above 8 indicates excellent performance; below 2 indicates very poor performance.

---

## Getting Started

### Prerequisites

| Tool | Minimum version | Required for |
|---|---|---|
| Git | 2.x | Cloning the repository |
| Docker | 24.x | Running containers |
| Docker Compose | 2.x | Orchestrating services |
| Node.js | 20.x | Frontend development only |
| Java JDK | 17 | Backend development only |
| Maven | 3.9 | Backend development only |

A [football-data.org](https://www.football-data.org/) API key is optional. Without it, the API import feature is unavailable but manual team creation remains fully functional.

### Quick Start with Docker Compose

**1. Clone the repository**

```bash
git clone https://github.com/JoseAntonioDiazBusati/coachlab-futbol.git
cd coachlab-futbol
```

**2. Create the environment file**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# JWT signing secret — minimum 256 bits in production
JWT_SECRET=replace-this-with-a-secure-random-string-at-least-32-characters

# football-data.org API key — free registration at football-data.org
FD_API_KEY=your_football_data_api_key_here
```

**3. Build and start**

```bash
docker compose up --build
```

**4. Open the application**

Navigate to `http://localhost`. Nginx serves the Angular SPA and proxies all `/api/*` requests to the backend container on the internal network.

**5. Stop**

```bash
docker compose down       # Stop containers, keep database volume
docker compose down -v    # Stop containers and delete the database volume
```

---

## Local Development

### Backend

```bash
cd backend/coachlab-springboot/coachlab

# Set environment variables (Linux/macOS)
export JWT_SECRET=dev-secret-change-me
export FD_API_KEY=your_api_key

# Windows PowerShell
$env:JWT_SECRET = "dev-secret-change-me"
$env:FD_API_KEY = "your_api_key"

# Start the application
mvn spring-boot:run
```

The backend starts at `http://localhost:8080`. The H2 web console is available at `http://localhost:8080/h2-console` using the JDBC URL `jdbc:h2:file:./data/coachlabdb`.

### Frontend

```bash
cd frontend

npm install
npm start    # Development server at http://localhost:4200, proxied to the backend
npm test     # Run unit tests
```

---

## Project Structure

```
coachlab-futbol/
|-- backend/
|   +-- coachlab-springboot/coachlab/
|       |-- src/main/java/com/coachlab/coachlab/
|       |   |-- controller/        REST controllers (Auth, Equipo, Jugador, Partido, FD proxy)
|       |   |-- service/           Business logic — AnalisisService, IRE, prediction
|       |   |-- model/             JPA entities
|       |   |-- repository/        Spring Data JPA repositories
|       |   |-- security/          JWT filter, SecurityConfig, UserDetailsServiceImpl
|       |   +-- dto/               Data Transfer Objects
|       |-- src/main/resources/
|       |   |-- application.properties
|       |   +-- application-prod.properties
|       |-- Dockerfile             Multi-stage: Maven build + JRE Alpine runtime
|       +-- pom.xml
|
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- components/        Angular components (auth, dashboard, squad, matches...)
|   |   |   |-- services/          HTTP services and interceptors
|   |   |   +-- design/            Global SCSS variables and design tokens
|   |   +-- environments/
|   |       |-- environment.ts          Development (Angular dev proxy)
|   |       |-- environment.docker.ts   Local Docker (Nginx reverse proxy)
|   |       +-- environment.prod.ts     Production (direct backend URL)
|   |-- Dockerfile                 Multi-stage: Node build + Nginx Alpine runtime
|   |-- Dockerfile.local           Docker Compose variant with reverse proxy configuration
|   |-- nginx.conf                 Production Nginx (SPA fallback + cache + security headers)
|   +-- nginx.local.conf           Local Nginx (SPA fallback + reverse proxy to backend)
|
|-- docs/                          Full project documentation (01 through 10 + despliegue)
|-- .github/workflows/             GitHub Actions CI/CD pipeline
|-- docker-compose.yml             Local orchestration (two services, volume, bridge network)
|-- render.yaml                    Render.com service definitions
+-- .env.example                   Environment variable template
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require the header `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new account |
| POST | `/api/auth/login` | Public | Authenticate and receive a JWT |

### Teams

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos` | Required | List all teams for the authenticated user |
| POST | `/api/equipos` | Required | Create a new team |
| GET | `/api/equipos/{id}` | Required | Get team by ID |
| PUT | `/api/equipos/{id}` | Required | Update team data |
| DELETE | `/api/equipos/{id}` | Required | Delete team |
| GET | `/api/equipos/{id}/ire` | Required | Get team IRE score |
| GET | `/api/equipos/{id}/resumen` | Required | Get full season KPI summary |
| GET | `/api/equipos/{idLocal}/prediccion/{idVisitante}` | Required | Match prediction probabilities |

### Players

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/jugadores` | Required | List players in the squad |
| POST | `/api/equipos/{id}/jugadores` | Required | Add a player |
| GET | `/api/equipos/{id}/jugadores/{jId}` | Required | Get player by ID |
| PUT | `/api/equipos/{id}/jugadores/{jId}` | Required | Update player data |
| DELETE | `/api/equipos/{id}/jugadores/{jId}` | Required | Remove a player |
| GET | `/api/equipos/{id}/jugadores/ranking` | Required | Player impact ranking |

### Matches

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/partidos` | Required | List all matches |
| POST | `/api/equipos/{id}/partidos` | Required | Register a match |
| GET | `/api/equipos/{id}/partidos/{pId}` | Required | Get match by ID |
| PUT | `/api/equipos/{id}/partidos/{pId}` | Required | Update match data |
| DELETE | `/api/equipos/{id}/partidos/{pId}` | Required | Delete a match |

### football-data.org Proxy

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fd/competiciones` | Required | List available competitions |
| GET | `/api/fd/competiciones/{code}/equipos` | Required | List teams in a competition |
| GET | `/api/fd/equipos/{id}/plantilla` | Required | Get professional team squad |
| GET | `/api/fd/equipos/{id}/partidos` | Required | Get recent matches of a professional team |

**Error response format:**

```json
{
  "timestamp": "2026-05-22T10:30:00",
  "error": "Bad Request",
  "mensaje": "El email ya está registrado."
}
```

| HTTP Status | Scenario |
|---|---|
| 400 | Invalid request data or validation failure |
| 401 | Missing or invalid JWT token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email on registration) |
| 500 | Internal server error |

---

## Testing

### Backend

Tests use JUnit 5, Spring Boot Test (`@SpringBootTest`), MockMvc for controller testing, and H2 in-memory mode as the test database — automatically configured by Spring Boot Test.

```bash
cd backend/coachlab-springboot/coachlab
mvn test
```

### Frontend

Tests use Jasmine and Karma with Angular TestBed. Test files follow the Angular convention of `*.spec.ts` co-located with each component or service.

```bash
cd frontend
npm test
```

### CI Test Execution

Both test suites run automatically on every push and pull request targeting `main`. The Docker build and deployment steps only proceed if both test jobs pass successfully.

### Manual Integration Tests

End-to-end scenarios were validated against both the local Docker Compose environment and the production deployment.

| ID | Scenario | Expected result |
|---|---|---|
| T-01 | Register a new account | JWT returned, redirect to Setup |
| T-02 | Login with valid credentials | JWT stored, redirect to Dashboard |
| T-03 | Login with invalid credentials | 401 error message shown |
| T-04 | Create team manually | Team saved, redirect to squad setup |
| T-05 | Import team from football-data.org | Competitions loaded, team data imported |
| T-06 | Add a player to the squad | Player appears in the squad list |
| T-07 | Register a match (win result) | Result displayed as VICTORIA |
| T-08 | View dashboard after several matches | KPI cards correct, IRE calculated |
| T-09 | Request a match prediction | Win/draw/loss percentages displayed |
| T-10 | Access a protected route without JWT | Redirected to login |

---

## Deployment

### Infrastructure

The application runs on **Render** as two independent Docker-based web services.

| Service | URL | Docker context |
|---|---|---|
| Backend | `https://coachlab-futbol.onrender.com` | `backend/coachlab-springboot/coachlab` |
| Frontend | `https://coachlab-futbol-eeiq.onrender.com` | `frontend` |

Both services use Render's free tier. Cold starts after a period of inactivity may take up to 30 seconds for the first response.

### CI/CD Pipeline

The pipeline is defined in `.github/workflows/docker-image.yml` and consists of four sequential stages:

```
Push to main
    |
    +-- test-frontend   (npm test)
    +-- test-backend    (mvn test)
         |
         | Both pass
         v
    +-- docker-backend   (build and push to Docker Hub)
    +-- docker-frontend  (build and push to Docker Hub)
         |
         v
    deploy (trigger Render deploy webhooks)
```

**Required GitHub Secrets:**

| Secret | Purpose |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub account username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render webhook URL for the backend service |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Render webhook URL for the frontend service |

### Docker Images

| Image | Registry | Approx. size |
|---|---|---|
| `joseantoniodiazbusati/coachlab-backend:latest` | Docker Hub | ~180 MB |
| `joseantoniodiazbusati/coachlab-frontend:latest` | Docker Hub | ~52 MB |

Both images use multi-stage builds. The backend discards the Maven toolchain in the final image, keeping only the JRE and the compiled JAR. The frontend discards the Node.js build layer, keeping only the Angular build output served by Nginx.

### Backend Environment Variables (Render)

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JWT_SECRET` | Secure random string, minimum 256 bits |
| `FD_API_KEY` | football-data.org API key |
| `H2_PATH` | `/data/coachlabdb` |
| `COACHLAB_CORS_ALLOWED_ORIGINS` | `https://coachlab-futbol-eeiq.onrender.com` |

For the complete deployment documentation including network topology, health checks, Nginx configuration, and the full evidence for each assessment criterion (Criterio 1 through Criterio 8), see [docs/despliegue.md](docs/despliegue.md).

---

## Documentation

All project documentation is in the `docs/` directory.

| File | Contents |
|---|---|
| [01-introduccion.md](docs/01-introduccion.md) | Origin, objectives, and comparison with similar tools |
| [02-descripcion.md](docs/02-descripcion.md) | Feature descriptions, IRE formula, and use cases |
| [03-instalacion.md](docs/03-instalacion.md) | Prerequisites, environment setup, and installation steps |
| [04-guia-estilos.md](docs/04-guia-estilos.md) | Colour palette, typography, spacing system, and SCSS tokens |
| [05-diseno.md](docs/05-diseno.md) | Architecture diagrams, ER model, API design, and process flows |
| [06-desarrollo.md](docs/06-desarrollo.md) | Development phases, technical decisions, and justifications |
| [07-pruebas.md](docs/07-pruebas.md) | Testing methodology, test cases, CI execution, and coverage |
| [08-despliegue.md](docs/08-despliegue.md) | Render configuration and CI/CD pipeline detail |
| [09-manual-usuario.md](docs/09-manual-usuario.md) | Step-by-step user guide |
| [10-conclusiones.md](docs/10-conclusiones.md) | Critical evaluation, scope fulfilment, and lessons learned |
| [despliegue.md](docs/despliegue.md) | Deployment module — Criterio 1 through 8 with full evidence |

---

## Future Improvements

**Short term**

- Migrate from H2 to PostgreSQL for data durability, concurrent access, and standard backup support.
- Implement a password recovery flow using Spring Mail and a token-based reset link.
- Allow a coach to manage multiple teams from a single account.
- Add PDF and CSV export for season summaries, match history, and squad lists.

**Medium term**

- Role-based access control within a team (head coach, assistant, analyst).
- Mobile application using Angular with Capacitor or a dedicated native framework.
- Automatic match result import from football-data.org for teams imported via the API.

**Long term**

- Video annotation linked to player match statistics.
- AI-assisted tactical recommendations based on aggregated season data.
- Freemium SaaS model with tiered feature access.

---

## License

This project was developed as an academic project for the Desarrollo de Aplicaciones Web (DAW) programme. It is not licensed for commercial use.
