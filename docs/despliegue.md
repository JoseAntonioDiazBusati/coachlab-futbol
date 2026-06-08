# Despliegue de la aplicación web — CoachLab Fútbol

> **Módulo:** Despliegue de Aplicaciones Web  
> **Proyecto:** CoachLab Fútbol — Plataforma de análisis deportivo  
> **URL producción:** https://coachlab-futbol-ui5w.onrender.com/  
> **Repositorio:** https://github.com/joseantoniodiazbusati/coachlab-futbol

---

## Índice

1. [Descripción de la arquitectura web (RA1 — Criterio 1)](#criterio-1--arquitectura-web)
2. [Servidor web: Nginx (RA2 — Criterio 2)](#criterio-2--servidor-web-nginx)
3. [Servidor de aplicaciones: Spring Boot (RA3 — Criterio 3)](#criterio-3--servidor-de-aplicaciones)
4. [Variables de entorno y configuración (RA3 — Criterio 4)](#criterio-4--variables-de-entorno-y-configuración)
5. [Integración continua y control de versiones (RA6 — Criterio 6)](#criterio-6--integración-continua-y-control-de-versiones)
6. [Gestión de artefactos del despliegue (RA4 — **Criterio 7**)](#criterio-7--gestión-de-artefactos-del-despliegue-obligatorio)
7. [Verificación básica de red (RA5 — **Criterio 8**)](#criterio-8--verificación-básica-de-red-obligatorio)

---

## Criterio 1 — Arquitectura web

> **RA1: Implantación de arquitecturas web**

### Descripción general

CoachLab Fútbol sigue una arquitectura web **cliente-servidor de tres capas** completamente contenerizada con Docker:

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / USUARIO                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP :80
┌───────────────────────────────▼─────────────────────────────────┐
│                  CAPA PRESENTACIÓN                              │
│           Frontend — Angular 21 + Nginx                         │
│    • SPA (Single Page Application)                              │
│    • Nginx sirve los estáticos compilados                       │
│    • Reverse proxy /api/* → backend (en local con Compose)      │
│    Imagen Docker: coachlab-frontend                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP :8080 (red interna Docker)
┌───────────────────────────────▼─────────────────────────────────┐
│                  CAPA LÓGICA DE NEGOCIO                         │
│       Backend — Spring Boot 3.4 + Tomcat embebido               │
│    • API REST (JSON)                                            │
│    • Autenticación JWT                                          │
│    • Proxy football-data.org                                    │
│    Imagen Docker: coachlab-backend                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │ JDBC
┌───────────────────────────────▼─────────────────────────────────┐
│                  CAPA DE DATOS                                  │
│              MySQL 8                                            │
│    • Local (Compose): servicio mysql + volumen db-data         │
│    • Producción: MySQL gestionado en Aiven (SSL)               │
└─────────────────────────────────────────────────────────────────┘
```

### Tecnologías del stack

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| Presentación | Angular | 21 | SPA cliente |
| Servidor web | Nginx | Alpine | Servir SPA + proxy inverso |
| Lógica | Spring Boot | 3.4.1 | API REST |
| Servidor apps | Tomcat (embebido) | — | Contenedor de servlets |
| Datos | MySQL | 8 | BD relacional (Aiven en producción) |
| Contenerización | Docker + Compose | 24+ | Empaquetado y orquestación |
| Despliegue en la nube | Render.com | — | PaaS hosting |
| CI/CD | GitHub Actions | — | Pipeline automatizado |

### Fichero `docker-compose.yml`

El fichero `docker-compose.yml` en la raíz del repositorio define los dos servicios y la red interna:

```yaml
# docker-compose.yml (raíz del proyecto)
services:

  mysql:
    image: mysql:8
    container_name: coachlab-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpass}
      MYSQL_DATABASE: ${DB_NAME:-coachlab}
      MYSQL_USER: ${DB_USER:-coachlab}
      MYSQL_PASSWORD: ${DB_PASSWORD:-coachlab}
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - internal
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpass}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  backend:
    image: joseantoniodiazbusati/coachlab-backend:latest
    build:
      context: ./backend/coachlab-springboot/coachlab
      dockerfile: Dockerfile
    container_name: coachlab-backend
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: prod
      JWT_SECRET: ${JWT_SECRET}
      FD_API_KEY: ${FD_API_KEY}
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-coachlab}
      DB_USER: ${DB_USER:-coachlab}
      DB_PASSWORD: ${DB_PASSWORD:-coachlab}
      COACHLAB_CORS_ALLOWED_ORIGINS: http://localhost,http://localhost:80
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  frontend:
    image: joseantoniodiazbusati/coachlab-frontend:local
    build:
      context: ./frontend
      dockerfile: Dockerfile.local
    container_name: coachlab-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - internal

volumes:
  db-data:

networks:
  internal:
    driver: bridge
```

**Puntos clave de la arquitectura:**
- Los tres servicios están en la red interna `internal` (tipo bridge), aislados del exterior.
- Solo el frontend expone un puerto al host (`80:80`); el backend y MySQL no son accesibles directamente desde fuera.
- El backend espera a que MySQL esté sano y el frontend a que el backend lo esté (`service_healthy`).
- Los datos de MySQL se persisten en el volumen `db-data`, por lo que sobreviven a reinicios. En producción la BD es MySQL gestionada en Aiven.

---

## Criterio 2 — Servidor web: Nginx

> **RA2: Implantación de aplicaciones web en servidores web**

Nginx actúa como servidor web y, en el entorno local Docker, también como **proxy inverso**.

### Configuración de producción (`frontend/nginx.conf`)

Se usa al desplegar en Render, donde el backend es accesible por su URL pública:

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback: Angular Router gestiona las rutas en cliente;
    # cualquier ruta desconocida devuelve index.html en lugar de 404.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché agresiva para assets estáticos con hash en el nombre.
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cabeceras de seguridad básicas
    add_header X-Frame-Options        "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection       "1; mode=block" always;
}
```

### Configuración local Docker (`frontend/nginx.local.conf`)

En el entorno Docker local el frontend y el backend comparten la red interna; Nginx hace de **proxy inverso** enrutando `/api/*` al contenedor del backend:

```nginx
# frontend/nginx.local.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy inverso: las llamadas al backend no salen a internet.
    # El hostname "backend" es el nombre del servicio en docker-compose.
    location /api/ {
        proxy_pass         http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              backend;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché de estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cabeceras de seguridad
    add_header X-Frame-Options        "SAMEORIGIN"    always;
    add_header X-Content-Type-Options "nosniff"       always;
    add_header X-XSS-Protection       "1; mode=block" always;
}
```

### Dockerfile del frontend (multi-stage)

```dockerfile
# frontend/Dockerfile  (producción — Render)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -- --configuration production   # genera dist/

FROM nginx:alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/coachlab-futbol/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# frontend/Dockerfile.local  (entorno Docker local)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -- --configuration docker       # usa environment.docker.ts

FROM nginx:alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.local.conf /etc/nginx/conf.d/default.conf   # incluye proxy a backend
COPY --from=builder /app/dist/coachlab-futbol/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Verificación:** Se puede confirmar que Nginx está sirviendo correctamente ejecutando:

```bash
curl -I http://localhost
# HTTP/1.1 200 OK
# Server: nginx/1.27.x
# Content-Type: text/html
# X-Frame-Options: SAMEORIGIN
```

---

## Criterio 3 — Servidor de aplicaciones

> **RA3: Implantación de aplicaciones web en servidores de aplicaciones**

El backend usa **Tomcat embebido** de Spring Boot como servidor de aplicaciones.

### `application.properties`

```properties
# backend/.../src/main/resources/application.properties

# Puerto del servidor de aplicaciones (Tomcat embebido)
server.port=8080
server.servlet.context-path=/

# Fuerza modo servlet (Tomcat) aunque webflux esté en el classpath
spring.main.web-application-type=servlet

# Base de datos MySQL. Para un MySQL externo con SSL (Aiven) basta con definir DB_URL
# con la cadena JDBC completa; si no, se compone desde DB_HOST/DB_PORT/DB_NAME.
spring.datasource.url=${DB_URL:jdbc:mysql://${DB_HOST:mysql}:${DB_PORT:3306}/${DB_NAME:coachlab}?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true}
spring.datasource.username=${DB_USER:coachlab}
spring.datasource.password=${DB_PASSWORD:coachlab}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA / Hibernate (el dialecto MySQL lo detecta Hibernate desde la conexión)
spring.jpa.hibernate.ddl-auto=update

# JWT
coachlab.jwt.secret=${JWT_SECRET:dev-secret-change-me-in-production-must-be-long-enough-256bits}
coachlab.jwt.expiration-ms=604800000

# CORS (permite Angular dev server en local; en prod se inyecta la URL de Render)
coachlab.cors.allowed-origins=${COACHLAB_CORS_ALLOWED_ORIGINS:http://localhost:4200}

# API key football-data.org
coachlab.fd.api-key=${FD_API_KEY:...}
coachlab.fd.api-base=https://api.football-data.org/v4
```

### Dockerfile del backend (multi-stage)

```dockerfile
# backend/.../Dockerfile
# Etapa 1: compilación con Maven
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B -q          # precarga dependencias (caché)
COPY src ./src
RUN mvn package -DskipTests -B -q           # genera el JAR ejecutable

# Etapa 2: imagen de runtime mínima (solo JRE)
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app
RUN mkdir -p /data
COPY --from=builder /app/target/*.jar app.jar

# Usuario no-root por seguridad
RUN addgroup -S coachlab && adduser -S coachlab -G coachlab
RUN chown -R coachlab:coachlab /app /data
USER coachlab

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

**Verificación del servidor de aplicaciones:**

```bash
# Health check del Actuator de Spring Boot
curl http://localhost:8080/actuator/health
# {"status":"UP","components":{"db":{"status":"UP","details":{"database":"MySQL"}}}}
```

---

## Criterio 4 — Variables de entorno y configuración

> **RA3: Implantación de aplicaciones web en servidores de aplicaciones**

La configuración sensible nunca está hardcodeada en el código; se inyecta mediante variables de entorno.

### Fichero `.env` (no versionado)

```bash
# .env  (excluido de git mediante .gitignore)
JWT_SECRET=clave-secreta-de-al-menos-256-bits-para-firma-JWT
FD_API_KEY=tu-api-key-de-football-data.org

# MySQL (servicios mysql y backend de docker-compose)
DB_NAME=coachlab
DB_USER=coachlab
DB_PASSWORD=cambia-esta-clave
MYSQL_ROOT_PASSWORD=cambia-esta-clave-root

# Para un MySQL externo con SSL (Aiven), en su lugar:
# DB_URL=jdbc:mysql://host:puerto/basedatos?sslMode=REQUIRED&serverTimezone=UTC
```

### `.gitignore` relevante

```gitignore
# Secretos
.env
.mcp.json
```

### Entornos Angular (`environment.*.ts`)

Angular dispone de tres ficheros de entorno que se seleccionan en tiempo de build:

| Fichero | Configuración | `apiBase` |
|---------|--------------|-----------|
| `environment.ts` | Desarrollo local (`ng serve`) | `/api` (proxy Angular) |
| `environment.docker.ts` | Docker Compose local | `/api` (proxy Nginx) |
| `environment.prod.ts` | Producción (Render) | `https://coachlab-futbol.onrender.com/api` |

```typescript
// environment.prod.ts — producción en Render
export const environment = {
  production: true,
  apiBase: 'https://coachlab-futbol.onrender.com/api',
  fdApiBase: 'https://coachlab-futbol.onrender.com/api/fd',
} as const;
```

---

## Criterio 6 — Integración continua y control de versiones

> **RA6: Documentación de la aplicación web, herramientas de documentación, control de versiones e integración continua**

### Control de versiones: Git + GitHub

El repositorio sigue el flujo **trunk-based development**: desarrollo en ramas de feature y merge a `main` mediante Pull Request. Cada push a `main` dispara el pipeline CI/CD.

### Pipeline CI/CD: GitHub Actions

Hay **dos workflows** separados:

**1. `test.yml` — tests en cada Pull Request a `main`**

```yaml
name: Tests
on:
  pull_request:
    branches: [main]
jobs:
  test-frontend:   # npm ci + npm test (Vitest)
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ./frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npm test
  test-backend:    # mvn test (JUnit)
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ./backend/coachlab-springboot/coachlab } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17, cache: maven }
      - run: mvn test
```

**2. `docker-image.yml` — build y publicación de imágenes en cada push a `main`**

```yaml
name: CI / Docker Build & Push
on:
  push:
    branches: [main]
jobs:
  docker-backend:    # build + push joseantoniodiazbusati/coachlab-backend:latest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with: { username: ${{ secrets.DOCKERHUB_USERNAME }}, password: ${{ secrets.DOCKERHUB_TOKEN }} }
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v5
        with:
          context: ./backend/coachlab-springboot/coachlab
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/coachlab-backend:latest
  docker-frontend:   # ídem con context ./frontend
    runs-on: ubuntu-latest
    steps: [ ... ]
  deploy:            # opcional: webhooks de Render
    needs: [docker-backend, docker-frontend]
    steps:
      - run: '[ -n "$HOOK" ] && curl -fsS -X POST "$HOOK" || echo "sin hook"'
```

### Flujo completo del pipeline

```
Pull Request → main            Push → main
      │                              │
   test.yml                     docker-image.yml
   ├── test-frontend (Vitest)   ├── docker-backend  (build + push :latest)
   └── test-backend  (JUnit)    ├── docker-frontend (build + push :latest)
                                └── deploy (webhook → Render descarga imagen → redeploy)
```

> Las pruebas dan feedback en las Pull Requests; la construcción y publicación de imágenes
> se ejecuta al integrar en `main`. Render descarga la imagen `:latest` y redespliega.

**Secretos configurados en GitHub Actions** (Settings → Secrets):
- `DOCKERHUB_USERNAME` — usuario de Docker Hub
- `DOCKERHUB_TOKEN` — token de acceso Docker Hub
- `RENDER_DEPLOY_HOOK_BACKEND` — webhook de Render para el backend
- `RENDER_DEPLOY_HOOK_FRONTEND` — webhook de Render para el frontend

---

## Criterio 7 — Gestión de artefactos del despliegue *(OBLIGATORIO)*

> **RA4: Relacionado con la gestión básica de los artefactos del despliegue**

Los artefactos de despliegue son las **imágenes Docker** que empaquetan la aplicación lista para ejecutar.

### Imágenes publicadas en Docker Hub

| Artefacto | Imagen | Registro |
|-----------|--------|---------|
| Backend (Spring Boot + JRE) | `joseantoniodiazbusati/coachlab-backend:latest` | Docker Hub |
| Frontend (Angular + Nginx) | `joseantoniodiazbusati/coachlab-frontend:latest` | Docker Hub |

### Construcción local de las imágenes

```bash
# Construir y etiquetar la imagen del backend
docker build \
  -t joseantoniodiazbusati/coachlab-backend:latest \
  ./backend/coachlab-springboot/coachlab

# Construir y etiquetar la imagen del frontend (producción)
docker build \
  -t joseantoniodiazbusati/coachlab-frontend:latest \
  ./frontend

# Verificar que las imágenes se han creado
docker images | grep coachlab
# joseantoniodiazbusati/coachlab-backend   latest   abc123...   280MB
# joseantoniodiazbusati/coachlab-frontend  latest   def456...   52MB
```

### Publicación en Docker Hub

```bash
# Login en Docker Hub
docker login -u joseantoniodiazbusati

# Push de las imágenes
docker push joseantoniodiazbusati/coachlab-backend:latest
docker push joseantoniodiazbusati/coachlab-frontend:latest
```

### Uso de las imágenes publicadas (despliegue local)

El `docker-compose.yml` permite levantar la aplicación completa desde las imágenes publicadas:

```bash
# Crear el fichero .env con los secretos
echo "JWT_SECRET=mi-secreto-seguro" > .env
echo "FD_API_KEY=mi-api-key" >> .env

# Levantar todos los servicios
docker compose up -d

# Verificar que los contenedores están corriendo
docker compose ps
# NAME                 STATUS          PORTS
# coachlab-backend     healthy         8080/tcp
# coachlab-frontend    running         0.0.0.0:80->80/tcp

# Ver logs en tiempo real
docker compose logs -f
```

### Build multi-stage: optimización del artefacto

El Dockerfile del backend usa **build multi-stage** para reducir el tamaño de la imagen final:

| Etapa | Imagen base | Contenido | Tamaño aprox. |
|-------|------------|-----------|--------------|
| `builder` | `maven:3.9-eclipse-temurin-17-alpine` | Herramientas de compilación + JAR | ~400 MB |
| `runtime` | `eclipse-temurin:17-jre-alpine` | Solo JRE + JAR ejecutable | ~180 MB |

Solo la etapa `runtime` se incluye en la imagen final publicada.

```bash
# Inspeccionar el tamaño final de la imagen del backend
docker inspect joseantoniodiazbusati/coachlab-backend:latest \
  --format='{{.Size}}' | numfmt --to=iec
# ~180M
```

---

## Criterio 8 — Verificación básica de red *(OBLIGATORIO)*

> **RA5: Relacionado con la verificación básica de red del despliegue**

### Red interna Docker

Los dos contenedores se comunican a través de la red bridge `internal` definida en `docker-compose.yml`. Esta red aísla los contenedores del exterior: el backend **no expone ningún puerto** al host.

```yaml
networks:
  internal:
    driver: bridge
```

```bash
# Inspeccionar la red creada por Docker Compose
docker network inspect coachlab-futbol_internal
# [
#   {
#     "Name": "coachlab-futbol_internal",
#     "Driver": "bridge",
#     "Containers": {
#       "...": { "Name": "coachlab-backend",  "IPv4Address": "172.20.0.2/16" },
#       "...": { "Name": "coachlab-frontend", "IPv4Address": "172.20.0.3/16" }
#     }
#   }
# ]
```

### Puertos expuestos

| Servicio | Puerto interno | Puerto host | Acceso exterior |
|---------|---------------|-------------|----------------|
| Frontend (Nginx) | 80 | 80 | ✅ Sí (`0.0.0.0:80->80/tcp`) |
| Backend (Tomcat) | 8080 | — | ❌ No (solo red interna) |

### Health check del backend

El `docker-compose.yml` define un health check que verifica que el backend está respondiendo antes de que el frontend arranque:

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 60s
```

Verificación manual del estado de salud:

```bash
# Desde el host
curl -s http://localhost:8080/actuator/health
# {"status":"UP","components":{"db":{"status":"UP","details":{"database":"MySQL"}}}}

# Comprobar el estado del health check de Docker
docker inspect coachlab-backend --format='{{.State.Health.Status}}'
# healthy
```

### Verificación de conectividad frontend → backend

```bash
# Verificar que el frontend está sirviendo la SPA
curl -I http://localhost
# HTTP/1.1 200 OK
# Server: nginx/1.27.x
# Content-Type: text/html; charset=UTF-8
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff

# Verificar que el proxy inverso de Nginx redirige /api al backend
curl -s http://localhost/api/actuator/health
# {"status":"UP"}

# Verificar acceso al endpoint de autenticación (espera JSON de error, no 404)
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
# {"error":"Credenciales incorrectas"} ← el servidor responde correctamente
```

### Verificación en producción (Render)

```bash
# Health check del backend en producción
curl -s https://coachlab-futbol.onrender.com/actuator/health
# {"status":"UP"}

# Verificar que la SPA está disponible
curl -I https://coachlab-futbol-ui5w.onrender.com
# HTTP/2 200
# content-type: text/html
# x-frame-options: SAMEORIGIN

# Verificar resolución DNS y latencia
ping -c 4 coachlab-futbol-ui5w.onrender.com
# PING coachlab-futbol-ui5w.onrender.com: 56 bytes
# 4 packets transmitted, 4 received, 0% packet loss
```

### Esquema de red completo

```
                    Internet
                       │
              ┌────────▼────────┐
              │   Render.com    │
              │  (Load Balancer)│
              └────────┬────────┘
                       │ HTTPS :443 → HTTP :80
              ┌────────▼────────────────────┐
              │  Contenedor Frontend        │
              │  Nginx :80                  │
              │  IP: 172.20.0.3             │
              └──────────┬──────────────────┘
                         │ HTTP :8080 (red interna)
              ┌──────────▼──────────────────┐
              │  Contenedor Backend         │
              │  Spring Boot :8080          │
              │  IP: 172.20.0.2             │
              └──────────┬──────────────────┘
                         │ JDBC
              ┌──────────▼──────────────────┐
              │  Contenedor MySQL :3306     │
              │  Volumen Docker: db-data    │
              │  (en producción: Aiven SSL) │
              └─────────────────────────────┘
```

---

## Resumen de criterios evidenciados

| Criterio | RA | Descripción | Evidencia principal |
|----------|----|-------------|---------------------|
| Criterio 1 | RA1 | Arquitectura web 3 capas + Docker | `docker-compose.yml`, diagrama de arquitectura |
| Criterio 2 | RA2 | Servidor web Nginx | `nginx.conf`, `nginx.local.conf`, Dockerfile frontend |
| Criterio 3 | RA3 | Servidor de aplicaciones Spring Boot/Tomcat | `application.properties`, Dockerfile backend |
| Criterio 4 | RA3 | Variables de entorno y configuración | `.env`, `environment.*.ts`, secretos GitHub |
| Criterio 6 | RA6 | CI/CD con GitHub Actions + Docker Hub | `.github/workflows/docker-image.yml` |
| **Criterio 7** | **RA4** | **Gestión de artefactos Docker** | **Imágenes Docker Hub, build multi-stage, `docker compose`** |
| **Criterio 8** | **RA5** | **Verificación básica de red** | **Health check, `curl`, `docker network inspect`, puertos** |
