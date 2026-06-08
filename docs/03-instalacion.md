# 3. Installation and Setup

## 3.1 Prerequisites

### Required Software

| Tool | Minimum Version | Purpose |
|---|---|---|
| Git | 2.x | Version control |
| Docker | 24.x | Container runtime |
| Docker Compose | 2.x | Multi-container orchestration |
| Java JDK | 17 | Backend development (optional if using Docker only) |
| Maven | 3.9 | Backend build tool (optional if using Docker only) |
| Node.js | 20.x | Frontend development |
| npm | 10.x | Frontend package manager |

### External Accounts (optional for full functionality)

- **football-data.org API key**: Free registration at [football-data.org](https://www.football-data.org/). The free tier allows access to competition and team data. Without this key, the API import functionality will not work, but manual team creation remains fully functional.

## 3.2 Environment Variables

Create a `.env` file at the repository root. This file is listed in `.gitignore` and must never be committed.

```env
# JWT signing secret — use a strong random string in production (min. 256 bits)
JWT_SECRET=replace-this-with-a-secure-random-string-at-least-32-characters

# football-data.org API key — obtain at football-data.org (free tier available)
FD_API_KEY=your_football_data_api_key_here

# MySQL database (used by the mysql and backend services in docker-compose)
DB_NAME=coachlab
DB_USER=coachlab
DB_PASSWORD=change-this-password
MYSQL_ROOT_PASSWORD=change-this-root-password

# For an EXTERNAL MySQL (Aiven, Railway...) that requires SSL, set the full JDBC URL:
# DB_URL=jdbc:mysql://host:port/database?sslMode=REQUIRED&serverTimezone=UTC
```

If `FD_API_KEY` is not provided, the football-data import features are disabled, but manual team creation works the same.

## 3.3 Local Installation with Docker Compose

This is the recommended method for running the full application locally.

**Step 1 — Clone the repository**

```bash
git clone https://github.com/JoseAntonioDiazBusati/coachlab-futbol.git
cd coachlab-futbol
```

**Step 2 — Create the environment file**

```bash
cp .env.example .env
# Edit .env and fill in your JWT_SECRET and FD_API_KEY
```

**Step 3 — Build and start the containers**

```bash
docker compose up --build
```

This command builds two Docker images and starts both services:
- **Backend** at `http://localhost:8080`
- **Frontend** (Nginx) at `http://localhost:80`

**Step 4 — Access the application**

Open `http://localhost` in your browser. The frontend serves the Angular SPA and proxies API calls to the backend at `http://backend:8080`.

**Step 5 — Stop the application**

```bash
docker compose down
```

To also remove the persistent database volume:

```bash
docker compose down -v
```

## 3.4 Local Development Setup (without Docker)

### Backend

The application always uses **MySQL**. To run it locally, use the `local` profile,
which reads connection details and secrets from a git-ignored
`application-local.properties` file pointing at a MySQL instance (the one from
`docker compose up mysql`, a local install, or a managed one such as Aiven).

**Step 1 — Navigate to the backend directory**

```bash
cd backend/coachlab-springboot/coachlab
```

**Step 2 — Create the local configuration**

```bash
cp src/main/resources/application-local.properties.example \
   src/main/resources/application-local.properties
# Fill in DB_URL/user/password, FD_API_KEY and JWT_SECRET
```

**Step 3 — Start the Spring Boot application with the local profile**

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The backend starts at `http://localhost:8080`. The OpenAPI/Swagger UI is available at
`http://localhost:8080/swagger-ui.html`. (The test suite uses an in-memory H2 database.)

### Frontend

**Step 1 — Navigate to the frontend directory**

```bash
cd frontend
```

**Step 2 — Install dependencies (reproducible)**

```bash
npm ci
```

**Step 3 — Start the development server**

```bash
npm start
```

The Angular dev server starts at `http://localhost:4200`. API calls are proxied to `http://localhost:8080` via `proxy.conf.json`.

**Step 4 — Run tests**

```bash
npm test
```

## 3.5 Docker Images

The project uses multi-stage Docker builds to produce minimal production images.

### Backend Dockerfile

Located at `backend/coachlab-springboot/coachlab/Dockerfile`.

- **Stage 1 (builder)**: Uses `maven:3.9-eclipse-temurin-17-alpine`. Copies `pom.xml`, downloads dependencies offline, copies source code, and runs `mvn package -DskipTests`.
- **Stage 2 (runtime)**: Uses `eclipse-temurin:17-jre-alpine`. Copies only the compiled JAR. Runs as a non-root user (`coachlab`).

### Frontend Dockerfile

Located at `frontend/Dockerfile`.

- **Stage 1 (builder)**: Uses `node:20-alpine`. Installs npm dependencies with `npm ci`, copies source, runs `npm run build --configuration production`.
- **Stage 2 (runtime)**: Uses `nginx:alpine`. Copies the Angular build output to `/usr/share/nginx/html` and the custom Nginx configuration.

## 3.6 Project Structure

```
coachlab-futbol/
├── backend/
│   └── coachlab-springboot/
│       └── coachlab/
│           ├── src/main/java/com/coachlab/coachlab/
│           │   ├── controller/      # REST controllers
│           │   ├── service/         # Business logic
│           │   ├── model/           # JPA entities
│           │   ├── repository/      # Spring Data repositories
│           │   ├── security/        # JWT filter, SecurityConfig
│           │   └── dto/             # Data Transfer Objects
│           ├── src/main/resources/
│           │   ├── application.properties
│           │   └── application-prod.properties
│           ├── Dockerfile
│           └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/          # Angular components
│   │   │   ├── services/            # HTTP services + interceptors
│   │   │   └── design/              # Global SCSS variables and tokens
│   │   └── environments/
│   │       ├── environment.ts       # Development environment
│   │       └── environment.prod.ts  # Production environment
│   ├── Dockerfile
│   ├── nginx.conf
│   └── angular.json
├── docs/                            # This documentation
├── docker-compose.yml
├── render.yaml
├── .github/workflows/               # CI/CD workflows
└── .env.example
```
