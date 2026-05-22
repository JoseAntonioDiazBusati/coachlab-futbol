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
        |-- H2 File Database (persistent volume)
        |
        |-- football-data.org API (external, HTTP)
```

**Local development** (Docker Compose): The Nginx container proxies `/api/*` requests to the backend container on the internal Docker network (`http://backend:8080`).

**Production** (Render): The Angular app calls the backend's public URL (`https://coachlab-futbol.onrender.com/api`) directly, with CORS configured on the Spring Boot backend to allow the frontend origin.

## 5.2 Entity-Relationship Diagram

The database consists of five entities:

```
USUARIO
  - id (PK)
  - nombre
  - email (unique)
  - password (BCrypt hash)

EQUIPO
  - id (PK)
  - nombre
  - categoria
  - temporada
  - ciudad
  - usuario_id (FK → USUARIO)

JUGADOR
  - id (PK)
  - nombre
  - apellidos
  - dorsal
  - posicion
  - edad
  - fotoUrl
  - equipo_id (FK → EQUIPO)

PARTIDO
  - id (PK)
  - fecha
  - rival
  - esLocal (boolean)
  - golesAFavor
  - golesEnContra
  - resultado (VICTORIA | EMPATE | DERROTA)
  - observaciones
  - equipo_id (FK → EQUIPO)

ESTADISTICA_JUGADOR
  - id (PK)
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
- **Coach** (authenticated user): The primary actor. All application features are accessed by the coach.
- **football-data.org API** (external system): Provides competition, team, and player data.

### Use Cases

```
Coach
  |-- UC-01: Register account
  |-- UC-02: Log in
  |-- UC-03: Log out
  |-- UC-04: Create team (manual)
  |-- UC-05: Import team from football-data.org API
  |        |-- includes: UC-11 (Browse competitions)
  |        |-- includes: UC-12 (Browse teams in competition)
  |-- UC-06: Add player to squad
  |-- UC-07: Edit player data
  |-- UC-08: Remove player from squad
  |-- UC-09: Register match
  |-- UC-10: Edit match data
  |-- UC-13: View dashboard (KPIs + IRE + recent form)
  |-- UC-14: View player impact ranking
  |-- UC-15: Request match prediction (pre-match)
  |-- UC-16: Browse professional leagues (Liga page)
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
(or Setup if no team)
```

### Match Registration Flow

```
Coach opens Register Match page
        |
        v
Fill in: date, opponent, home/away,
         goals for, goals against,
         observations
        |
        v
POST /api/equipos/{id}/partidos
        |
        v
Backend @PrePersist calculates
resultado: VICTORIA / EMPATE / DERROTA
        |
        v
(Optional) Add player statistics
POST /api/equipos/{id}/jugadores/{jId}/estadisticas
        |
        v
Dashboard KPIs updated on next load
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
| POST | `/api/auth/register` | Public | `{ nombre, email, password }` | `{ token, email, nombre }` |
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ token, email, nombre }` |

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
| POST | `/api/equipos/{id}/partidos` | Required | Register a match |
| GET | `/api/equipos/{id}/partidos/{pId}` | Required | Get match by ID |
| PUT | `/api/equipos/{id}/partidos/{pId}` | Required | Update match data |
| DELETE | `/api/equipos/{id}/partidos/{pId}` | Required | Delete match |

### football-data.org Proxy (FD)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fd/competiciones` | Required | List available competitions |
| GET | `/api/fd/competiciones/{code}/equipos` | Required | List teams in competition |
| GET | `/api/fd/equipos/{id}/plantilla` | Required | Get squad of a professional team |
| GET | `/api/fd/equipos/{id}/partidos` | Required | Get recent matches of a professional team |

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
