# ── Etapa 1: Build Angular ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos primero para aprovechar la caché de Docker
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copiar el resto del código fuente
COPY . .

# Build de producción
RUN npm run build -- --configuration production

# ── Etapa 2: Nginx para servir la SPA ────────────────────────────────────────
FROM nginx:alpine AS runtime

# Eliminar la configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos del build (Angular 17+ genera en /browser)
COPY --from=builder /app/dist/coachlab-futbol/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
