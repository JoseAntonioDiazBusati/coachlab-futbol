# ── Etapa 1: Build con Maven ──────────────────────────────────────────────────
# Imagen oficial que incluye Maven 3.9 + JDK 17 (Alpine)
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Las rutas son relativas al Docker build context.
# En Render el context es la raíz del repo; en local puede ser este directorio.
# ARG permite sobreescribir la ruta base si es necesario.
ARG SRC_PATH=backend/coachlab-springboot/coachlab

# Copiar pom.xml primero para aprovechar la caché de capas de dependencias
COPY ${SRC_PATH}/pom.xml .
RUN mvn dependency:go-offline -B -q

# Copiar el código fuente y compilar
COPY ${SRC_PATH}/src ./src
RUN mvn package -DskipTests -B -q

# ── Etapa 2: Runtime con JRE mínimo ──────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Crear directorio para la base de datos H2 persistente
RUN mkdir -p /data

# Copiar el JAR generado
COPY --from=builder /app/target/*.jar app.jar

# Usuario no-root para seguridad
RUN addgroup -S coachlab && adduser -S coachlab -G coachlab
RUN chown -R coachlab:coachlab /app /data
USER coachlab

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
