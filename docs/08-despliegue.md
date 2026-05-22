# 8. Deployment

## 8.1 Deployment Environment

CoachLab is deployed on **Render** ([render.com](https://render.com)), a cloud platform that supports Docker-based deployments with automatic deploys on Git push.

### Services on Render

| Service | Type | URL | Docker Context |
|---|---|---|---|
| **backend** | Web Service (Docker) | `https://coachlab-futbol.onrender.com` | `backend/coachlab-springboot/coachlab` |
| **frontend** | Web Service (Docker) | `https://coachlab-futbol-eeiq.onrender.com` | `frontend` |

Both services use the **free tier** of Render. On the free tier, services spin down after 15 minutes of inactivity and may take up to 30 seconds to respond to the first request after a cold start.

## 8.2 Render Service Configuration

### Backend Service

| Setting | Value |
|---|---|
| Runtime | Docker |
| Root Directory | `backend/coachlab-springboot/coachlab` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Branch | `main` |
| Auto-Deploy | On Commit |

**Environment Variables on Render (backend):**

| Variable | Description |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JWT_SECRET` | Secure random string (256-bit minimum) |
| `FD_API_KEY` | football-data.org API key |
| `H2_PATH` | `/data/coachlabdb` |
| `COACHLAB_CORS_ALLOWED_ORIGINS` | `https://coachlab-futbol-eeiq.onrender.com` |

### Frontend Service

| Setting | Value |
|---|---|
| Runtime | Docker |
| Root Directory | `frontend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Branch | `main` |
| Auto-Deploy | On Commit |

No additional environment variables are required for the frontend in production, as the backend URL is baked into the Angular build via `environment.prod.ts`.

## 8.3 CI/CD Pipeline

The CI/CD pipeline is implemented with **GitHub Actions** (`.github/workflows/docker-image.yml`).

### Pipeline Stages

```
Push to main branch
        |
        v
[test-frontend] ─────── [test-backend]
  npm ci                   mvn test
  npm test                 (JUnit 5)
  (Karma/Jasmine)
        |                      |
        v                      v
[docker-frontend] ──── [docker-backend]
  docker build             docker build
  docker push              docker push
  (Docker Hub)             (Docker Hub)
        |                      |
        v                      v
           [deploy]
     Trigger Render webhooks
     (frontend + backend)
```

> Note: The Docker Hub build and push stages and Render webhook triggers require the following GitHub Secrets to be configured: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_FRONTEND`.

On pull requests to `main`, only the test stages run (no build or deploy).

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

# Render detects the push and redeploys automatically.
# Deployment takes approximately 3-5 minutes.
```

### Monitoring Deployment

The deployment progress can be monitored in real time in the Render dashboard under each service's **Logs** tab. A successful deployment ends with:

```
==> Your service is live
```

### Rollback

To roll back to a previous deployment, go to Render dashboard → service → **Deploys** tab → select the previous successful deploy → **Rollback to this deploy**.

## 8.5 Database Persistence

The H2 database file is stored in a Render disk (persistent volume) mounted at `/data`. The volume survives service restarts and redeployments.

On Render's free tier, persistent disks are available but the service may be redeployed on a new instance, which could result in data loss if the disk is not correctly attached. This is a known limitation of the free tier and a primary motivation for migrating to PostgreSQL in future versions.

## 8.6 Infrastructure Diagram

```
GitHub Repository (main branch)
        |
        | push
        v
GitHub Actions CI
  ├── Run frontend tests (npm test)
  ├── Run backend tests (mvn test)
  ├── Build & push Docker images to Docker Hub
  └── Trigger Render deploy webhooks
        |
        v
Render Cloud Platform
  ├── backend (Web Service, Docker)
  │     ├── Port: 8080
  │     ├── H2 database file at /data/coachlabdb
  │     └── URL: https://coachlab-futbol.onrender.com
  │
  └── frontend (Web Service, Docker)
        ├── Nginx serving Angular SPA
        ├── Port: 80 (mapped to 443 by Render)
        └── URL: https://coachlab-futbol-eeiq.onrender.com

Browser
  ├── Loads SPA from: https://coachlab-futbol-eeiq.onrender.com
  └── API calls to: https://coachlab-futbol.onrender.com/api/*
```
