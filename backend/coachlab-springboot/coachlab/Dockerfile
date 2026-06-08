# ── Etapa 1: Build con Maven ──────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B -q

COPY src ./src
RUN mvn package -DskipTests -B -q

# ── Etapa 2: Runtime con JRE mínimo ──────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app
RUN mkdir -p /data

COPY --from=builder /app/target/*.jar app.jar

RUN addgroup -S coachlab && adduser -S coachlab -G coachlab
RUN chown -R coachlab:coachlab /app /data
USER coachlab

# La imagen arranca en perfil prod por defecto (MySQL). Render/Compose pueden
# sobrescribirlo con SPRING_PROFILES_ACTIVE si hiciera falta.
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
