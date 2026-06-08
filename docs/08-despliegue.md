# 8. Deployment

## 8.1 Deployment Environment

CoachLab is deployed on **Render** ([render.com](https://render.com)) with a managed
**MySQL** database on **Aiven**. The Docker images are built and published to Docker Hub
by GitHub Actions; Render pulls those images (backend) or serves the static build (frontend).

### Services

| Service | Type | URL / source |
|---|---|---|
| **frontend** | Render **Static Site** | https://coachlab-futbol-ui5w.onrender.com/ |
| **backend** | Render **Web Service** (Docker image from Docker Hub) | `joseantoniodiazbusati/coachlab-backend:latest` |
| **database** | **Aiven** MySQL 8 (managed, SSL) | external `DB_URL` |

Both Render services use the **free tier**. On the free tier, the backend spins down after
~15 minutes of inactivity and may take up to 30 seconds to respond to the first request.

## 8.2 Render Service Configuration

### Backend Service (Render Web Service, Docker image)

| Setting | Value |
|---|---|
| Runtime | Image (`joseantoniodiazbusati/coachlab-backend:latest`) |
| Branch trigger | `main` (image rebuilt by GitHub Actions, then redeploy) |

**Environment Variables on Render (backend):**

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` (the image already defaults to it) |
| `JWT_SECRET` | Secure random string (256-bit minimum) |
| `FD_API_KEY` | football-data.org API key |
| `DB_URL` | Full Aiven JDBC string (`jdbc:mysql://...:port/defaultdb?sslMode=REQUIRED&serverTimezone=UTC`) |
| `DB_USER` / `DB_PASSWORD` | Aiven credentials |
| `COACHLAB_CORS_ALLOWED_ORIGINS` | `https://coachlab-futbol-ui5w.onrender.com` |
| `COACHLAB_SEED_DEMO` | `true` to seed the three demo users |

### Frontend Service (Render Static Site)

The frontend is published as a **Static Site** serving the Angular production build.
Because it is a Single Page Application, a **rewrite rule** is configured so any path
falls back to `index.html` (otherwise refreshing a deep route such as `/dashboard`
would return *Not Found*):

| Setting | Value |
|---|---|
| Source path | `/*` |
| Destination | `/index.html` |
| Action | **Rewrite** |

The Angular app reaches the backend at its public Render URL (CORS-enabled on the backend).

## 8.3 CI/CD Pipeline

The CI/CD pipeline is implemented with **GitHub Actions** across two workflows:

### Pipeline Stages

```
Pull request → main                Push → main
        |                                |
        v                                v
  test.yml                          docker-image.yml
  ├── test-frontend (npm test)      ├── docker-backend  (build + push :latest)
  └── test-backend  (mvn test)      ├── docker-frontend (build + push :latest)
                                    └── deploy (Render deploy webhooks, optional)
```

- **`test.yml`** runs both test suites on every pull request to `main`.
- **`docker-image.yml`** builds and publishes the Docker images to Docker Hub on every
  push to `main`, and optionally triggers the Render deploy webhooks.

> Required GitHub Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (and, if the deploy
> webhooks are used, `RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_FRONTEND`).

## 8.4 Deployment Process

### Standard Deployment (feature completed on `dev`)

```bash
# 1. Ensure all changes are committed on dev
git add <files>
git commit -m "feat: description of the feature"
git push origin dev

# 2. Merge to main
git checkout main
git merge dev
git push origin main

# GitHub Actions rebuilds and publishes the Docker images (~2-3 min).
# Render then redeploys the backend (via the deploy webhook or a manual deploy)
# pulling the new :latest image. Total time ~3-5 minutes.
```

### Monitoring Deployment

The deployment progress can be monitored in real time in the Render dashboard under each service's **Logs** tab. A successful deployment ends with:

```
==> Your service is live
```

### Rollback

To roll back to a previous deployment, go to Render dashboard → service → **Deploys** tab → select the previous successful deploy → **Rollback to this deploy**.

## 8.5 Database Persistence

In production the database is a managed **MySQL 8 instance on Aiven**, external to Render
and reachable over SSL via the `DB_URL` connection string. Because the data lives in the
managed database (not in the application container), it persists across backend restarts
and redeployments. Locally, `docker-compose` runs a `mysql:8` service with a named Docker
volume (`db-data`) for the same purpose. The test suite uses an in-memory H2 database only.

## 8.6 Infrastructure Diagram

```
GitHub Repository (main branch)
        |
        | push
        v
GitHub Actions (docker-image.yml)
  ├── Build & push Docker images to Docker Hub
  └── (optional) Trigger Render deploy webhooks
        |
        v
Render Cloud Platform                         Aiven
  ├── backend (Web Service, Docker image)      └── MySQL 8 (managed, SSL)
  │     ├── Port: 8080                                ^
  │     └── connects via JDBC ───────────────────────┘
  │
  └── frontend (Static Site)
        ├── Serves the Angular production build
        ├── Rewrite /* → /index.html (SPA)
        └── URL: https://coachlab-futbol-ui5w.onrender.com

Browser
  ├── Loads the SPA from: https://coachlab-futbol-ui5w.onrender.com
  └── API calls to the backend's public Render URL (CORS-enabled)
```
