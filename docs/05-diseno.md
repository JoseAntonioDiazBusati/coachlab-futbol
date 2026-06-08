# 5. Design

## 5.1 Application Architecture

CoachLab follows a classic client-server architecture with a clear separation between the frontend SPA and the backend REST API.

```
Browser (Angular SPA)
        |
        | HTTPS (direct API calls in production)
        |
Spring Boot REST API (port 8080)
        |
        |-- MySQL 8 (Aiven in production · Docker volume locally)
        |
        |-- football-data.org API (external, HTTP)
```

**Local development** (Docker Compose): The Nginx container reverse-proxies `/api/*` requests to the backend container on the internal Docker network (`http://backend:8080`), which in turn connects to the `mysql` service.

**Production** (Render): the frontend is a Render Static Site; the Angular app calls the backend's public Render URL directly, with CORS configured on the Spring Boot backend to allow the frontend origin. The backend connects to a managed **MySQL 8 database on Aiven** over SSL.

## 5.2 Entity-Relationship Diagram

The database consists of five entities:

```
USUARIO
  - id (PK)
  - nombre
  - email (unique)
  - password (BCrypt hash)
  - rol (ENTRENADOR | OJEADOR)
  - fechaRegistro

EQUIPO
  - id (PK)
  - nombre
  - categoria
  - temporada
  - ciudad
  - escudoUrl
  - usuario_id (FK → USUARIO)

JUGADOR
  - id (PK)
  - nombre
  - apellidos
  - dorsal
  - posicion
  - edad
  - externalId (id in football-data.org, if imported)
  - equipo_id (FK → EQUIPO)

PARTIDO
  - id (PK)
  - fecha
  - rival
  - esLocal (boolean)
  - golesAFavor
  - golesEnContra
  - competicion
  - resultado (VICTORIA | EMPATE | DERROTA)
  - origen (MANUAL | FOOTBALL_DATA)
  - externalId
  - observaciones
  - equipo_id (FK → EQUIPO)

ESTADISTICA_JUGADOR
  - id (PK)
  - esTitular (boolean)
  - minutosJugados
  - goles
  - asistencias
  - tarjetasAmarillas
  - tarjetasRojas
  - jugador_id (FK → JUGADOR)
  - partido_id (FK → PARTIDO)
```

**Relationships:**
- `USUARIO` 1 — N `EQUIPO`
- `EQUIPO` 1 — N `JUGADOR`
- `EQUIPO` 1 — N `PARTIDO`
- `JUGADOR` 1 — N `ESTADISTICA_JUGADOR`
- `PARTIDO` 1 — N `ESTADISTICA_JUGADOR`

## 5.3 Use Case Diagram

### Actors
- **Coach (entrenador)** (authenticated user): manages teams, squads and matches.
- **Scout (ojeador)** (authenticated user, read-only): compares squads.
- **football-data.org API** (external system): provides competition, team, and player data.

### Use Cases

```
Coach (ENTRENADOR)
  |-- UC-01: Register account / Log in / Log out
  |-- UC-04: Create team (manual)
  |-- UC-05: Import team from football-data.org API
  |        |-- includes: UC-11 (Browse competitions)
  |        |-- includes: UC-12 (Browse teams in competition)
  |-- UC-06: Add / edit / remove player
  |-- UC-09: Register match with per-player statistics
  |-- UC-13: View dashboard (KPIs + IRE + recent form)
  |-- UC-14: View player impact ranking
  |-- UC-15: Build line-up and request match prediction

Scout (OJEADOR)
  |-- UC-01: Register account / Log in / Log out
  |-- UC-17: Compare two squads (app and/or API teams)
```

## 5.4 Main Process Flow Diagrams

### Authentication Flow

```
User enters credentials
        |
        v
POST /api/auth/login
        |
   [Valid?]
   /       \
 Yes        No
  |          |
  v          v
Store JWT   Show error
in localStorage
  |
  v
Redirect to Dashboard
(or Ligas if no team)
```

### Match Registration Flow

```
Coach opens Register Match page
        |
        v
Fill in: date, opponent, home/away,
         goals for/against, competition,
         and per-player statistics
         (starter, minutes, goals, assists, cards)
        |
        v
POST /api/equipos/{id}/partidos/full
   (match + statistics in a single call)
        |
        v
Backend @PrePersist calculates
resultado: VICTORIA / EMPATE / DERROTA
        |
        v
Dashboard KPIs and rankings updated on next load
```

### IRE Calculation Flow

```
GET /api/equipos/{id}/ire
        |
        v
Load all matches for the team
        |
        v
Calculate:
  wins, draws, losses from results
  avg goals for and against
        |
        v
Apply formula:
  score_results = (wins×3 + draws×1) / (total×3)
  goal_diff = clamp((avg_for - avg_against) / 3, -1, 1)
  IRE = (score_results×0.7 + goal_diff×0.3 + 0.3) × 10
  IRE = clamp(IRE, 0, 10), rounded to 2 decimals
        |
        v
Return { equipoId, ire, descripcion }
```

## 5.5 API Design

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <JWT>` header.

### Authentication

| Method | Endpoint | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ nombre, email, password, rol? }` | `{ token, email, nombre, rol }` |
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ token, email, nombre, rol }` |

Write operations (POST/PUT/DELETE under `/api/equipos/**`) require the **ENTRENADOR** role; an **OJEADOR** receives `403`.

### Teams (Equipos)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos` | Required | List all teams for the authenticated user |
| POST | `/api/equipos` | Required | Create a new team |
| GET | `/api/equipos/{id}` | Required | Get team by ID |
| PUT | `/api/equipos/{id}` | Required | Update team data |
| DELETE | `/api/equipos/{id}` | Required | Delete team |
| GET | `/api/equipos/{id}/ire` | Required | Get team IRE score |
| GET | `/api/equipos/{id}/resumen` | Required | Get season summary (all KPIs) |
| GET | `/api/equipos/{idLocal}/prediccion/{idVisitante}` | Required | Match prediction probabilities |

### Players (Jugadores)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/jugadores` | Required | List players in squad |
| POST | `/api/equipos/{id}/jugadores` | Required | Add player to squad |
| GET | `/api/equipos/{id}/jugadores/{jId}` | Required | Get player by ID |
| PUT | `/api/equipos/{id}/jugadores/{jId}` | Required | Update player data |
| DELETE | `/api/equipos/{id}/jugadores/{jId}` | Required | Remove player |
| GET | `/api/equipos/{id}/jugadores/ranking` | Required | Player impact ranking |

### Matches (Partidos)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipos/{id}/partidos` | Required | List all matches |
| POST | `/api/equipos/{id}/partidos/full` | ENTRENADOR | Register a match with its per-player statistics |
| GET | `/api/equipos/{id}/partidos/{pId}` | Required | Get match detail (with statistics) |
| GET | `/api/equipos/{id}/partidos/{pId}/estadisticas` | Required | Get the match statistics |
| PUT | `/api/equipos/{id}/partidos/{pId}` | ENTRENADOR | Update match data |
| DELETE | `/api/equipos/{id}/partidos/{pId}` | ENTRENADOR | Delete match |
| GET | `/api/equipos/{id}/partidos/preview-fd` | Required | Editable preview of a football-data match |

### Comparator / exploration (read-only)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/explorar/equipos` | Required | List all app teams (for comparison) |
| GET | `/api/explorar/equipos/{id}/jugadores` | Required | Squad/ranking of any team |

### football-data.org Proxy (FD)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fd/competiciones` | Required | List available competitions |
| GET | `/api/fd/competiciones/{code}/equipos` | Required | List teams in competition |
| GET | `/api/fd/teams/{id}` | Required | Get squad of a professional team |
| GET | `/api/fd/teams/{id}/matches` | Required | Get recent matches of a professional team |
| GET | `/api/fd/competiciones/{code}/scorers` | Required | Get top scorers of a competition |

### Error Responses

All errors follow a consistent structure:

```json
{
  "timestamp": "2026-05-22T10:30:00",
  "error": "Bad Request",
  "mensaje": "El email ya está registrado."
}
```

| HTTP Status | Scenario |
|---|---|
| 400 | Invalid request data (validation errors, bad format) |
| 401 | Missing or invalid JWT token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Internal server error |
