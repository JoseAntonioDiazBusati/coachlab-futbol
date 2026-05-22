# 6. Development

## 6.1 Development Sequence

The project was developed following an iterative, feature-by-feature approach. Each iteration produced a working, deployable increment.

### Phase 1 — Project Setup and Infrastructure
- Repository initialisation with a `main`/`dev` branching strategy.
- Backend project scaffolding with Spring Initializr (Spring Boot 3.4.1, Java 17).
- Frontend project scaffolding with Angular CLI (Angular 21.2).
- Docker Compose configuration for local orchestration.
- GitHub Actions CI workflow for automated testing.

### Phase 2 — Authentication
- JWT token provider (`JwtTokenProvider`) using the JJWT library.
- `JwtAuthenticationFilter` for stateless request authentication.
- `SecurityConfig` with Spring Security, stateless session policy, and public auth endpoints.
- `AuthController` with `/api/auth/register` and `/api/auth/login` endpoints.
- Angular `AuthService` and `authInterceptor` for automatic token attachment.
- Login/Register UI component (`auth-panel`).

### Phase 3 — Core Domain (Team, Players, Matches)
- JPA entities: `Equipo`, `Jugador`, `Partido`, `EstadisticaJugador`.
- Spring Data repositories with custom JPQL queries.
- Service layer with business logic validation.
- REST controllers for each resource.
- Angular services consuming the REST API.
- Setup wizard UI (manual and API-import flows).
- Squad management page (Plantilla).
- Match registration page (Registrar Partido).

### Phase 4 — Statistics and Analysis
- `AnalisisService` implementing IRE calculation, season summary, and match prediction.
- Dashboard page with KPI cards, IRE display, recent form streak, and performance chart.
- Pre-match page with comparative IRE and probability display.
- Player impact ranking endpoint and UI.

### Phase 5 — External API Integration
- `FootballDataProxyService` using Spring WebFlux `WebClient`.
- `FootballDataController` with competition, team, and squad proxy endpoints.
- Liga page in Angular for browsing professional competitions.
- Error handling for external API failures (401, 429, 5xx).

### Phase 6 — Deployment and DevOps
- Render deployment configuration (`render.yaml`).
- Multi-stage Dockerfiles for both services.
- CORS configuration in Spring Security.
- Production Angular environment with direct backend URL.
- Nginx configuration for SPA serving.

## 6.2 Key Technical Decisions and Justifications

### 6.2.1 H2 File Database instead of PostgreSQL

**Decision**: Use H2 in file-persistence mode rather than PostgreSQL.

**Justification**: The project targets a single-coach single-team use case, where data volumes are very small (tens of matches, dozens of players). H2 file mode provides full SQL capabilities with zero infrastructure cost — no additional database service is needed. This is appropriate for the project's scope and eliminates the need to manage a separate database container or cloud database instance.

**Trade-off**: H2 is not suitable for multi-user, high-concurrency production use. A migration to PostgreSQL would be required to scale beyond a single concurrent user.

### 6.2.2 JWT Stateless Authentication

**Decision**: Implement stateless JWT authentication rather than server-side sessions.

**Justification**: JWT is a natural fit for REST APIs consumed by SPAs. It eliminates the need for server-side session storage, making the backend horizontally scalable. The token contains enough information (email) for the server to identify the user without database lookups on every request.

### 6.2.3 Angular 21 with Standalone Components

**Decision**: Use Angular 21 with standalone components and the new control flow syntax (`@if`, `@for`).

**Justification**: Angular 21's standalone component model eliminates NgModule boilerplate, reducing configuration overhead. The new `@for` syntax with mandatory `track` expressions prevents rendering bugs caused by duplicate key values.

### 6.2.4 Spring WebFlux WebClient for External API

**Decision**: Use `WebClient` (reactive) rather than `RestTemplate` (blocking) for football-data.org API calls, despite the backend being servlet-based.

**Justification**: `WebClient` is the modern recommended HTTP client in Spring, even for non-reactive backends. It provides cleaner error handling with `onStatus()` operators. `spring.main.web-application-type=servlet` is explicitly set to prevent WebFlux from taking over the server configuration.

### 6.2.5 Separate `UserDetailsServiceImpl` to Break Circular Dependency

**Decision**: Extract `UserDetailsService` into a standalone `@Service` class (`UserDetailsServiceImpl`), separate from `SecurityConfig`.

**Justification**: Defining `UserDetailsService` as a `@Bean` inside `SecurityConfig` created a circular dependency: `SecurityConfig` → `JwtAuthenticationFilter` → `UserDetailsService` (in `SecurityConfig`). Extracting it broke the cycle without requiring `@Lazy`.

### 6.2.6 `@JsonIgnore` on Lazy Relationships

**Decision**: Annotate all bidirectional JPA relationships with `@JsonIgnore`.

**Justification**: Jackson's default serialisation attempts to traverse the entire object graph, triggering `LazyInitializationException` for uninitialized Hibernate proxies outside a transaction, and causing infinite recursion for bidirectional relationships. `@JsonIgnore` prevents serialisation of these relationships, returning clean flat objects to the API consumers.

## 6.3 Difficulties Encountered and Solutions

| Difficulty | Root Cause | Solution |
|---|---|---|
| `mvn: not found` in Docker | Builder image was `eclipse-temurin:17-jdk`, which does not include Maven | Changed to `maven:3.9-eclipse-temurin-17-alpine` |
| Circular bean dependency at startup | `SecurityConfig` defined `UserDetailsService` and was also injected by `JwtAuthenticationFilter` | Extracted `UserDetailsServiceImpl` as a standalone `@Service` |
| `LazyInitializationException` on API responses | Jackson serialising JPA entities with uninitialised lazy collections | Added `@JsonIgnore` to all `@OneToMany` and `@ManyToOne` bidirectional fields |
| NG0955 duplicate track keys | Angular `@for` tracking by a non-unique field (`href: '#'` in footer, `code: null` in competitions) | Changed tracking to `$index` for footer links and `id` for competition objects |
| XSS sanitisation warning | SVG content injected via `[innerHTML]` | Used `DomSanitizer.bypassSecurityTrustHtml()` with known-safe SVG strings |
| `Map.of()` NPE in exception handler | `Map.of()` throws `NullPointerException` if any value is `null`; `ex.getMessage()` can be null | Replaced all `Map.of()` with `HashMap` and added null-safe fallback |
| Render Docker build context empty (2B) | Render's service configuration ignored `dockerContext` in `render.yaml` | Set the Docker Build Context Directory manually in Render's service UI Settings |
| Frontend nginx `host not found: backend` | Render does not share a Docker network between services; `backend` hostname does not resolve | Removed nginx proxy; Angular calls backend's public URL directly; CORS configured on backend |
| `npm ci` failing on Render | `package-lock.json` missing transitive dependencies (`@emnapi/core`, `@emnapi/runtime`) | Deleted `node_modules` and `package-lock.json`; regenerated with fresh `npm install` |
| Angular build budget error | Google Fonts inline CSS (18.5 kB) exceeded `anyComponentStyle` budget of 16 kB | Increased budget limits in `angular.json` |

## 6.4 Version Control

The project uses Git with a two-branch strategy:

- **`main`**: The production branch. Render deploys automatically on every push to `main`. Only stable, tested code is merged here.
- **`dev`**: The active development branch. All features and fixes are developed here and merged to `main` via pull requests.

Feature branches are created from `dev` for larger features (e.g. `plantilla`, `pre-partido`, `registro-partido`).

## 6.5 Relevant Code Fragments

### IRE Calculation (AnalisisService.java)

```java
public double calcularIRE(Long equipoId) {
    List<Partido> partidos = partidoRepository.findByEquipoIdOrderByFechaDesc(equipoId);
    if (partidos.isEmpty()) return 0.0;

    int total = partidos.size();
    long victorias = partidos.stream()
        .filter(p -> p.getResultado() == ResultadoPartido.VICTORIA).count();
    long empates = partidos.stream()
        .filter(p -> p.getResultado() == ResultadoPartido.EMPATE).count();

    double puntuacionResultados = ((victorias * 3.0) + (empates * 1.0)) / (total * 3.0);

    Double mediaAFavor   = partidoRepository.mediaGolesAFavor(equipoId);
    Double mediaEnContra = partidoRepository.mediaGolesEnContra(equipoId);
    double diferenciaGoles = (mediaAFavor != null && mediaEnContra != null)
        ? Math.max(-1, Math.min(1, (mediaAFavor - mediaEnContra) / 3.0))
        : 0;

    double ire = ((puntuacionResultados * 0.7) + (diferenciaGoles * 0.3 + 0.3)) * 10;
    return Math.round(Math.max(0, Math.min(10, ire)) * 100.0) / 100.0;
}
```

### Automatic Result Calculation (Partido.java)

```java
@PrePersist
@PreUpdate
public void calcularResultado() {
    if (golesAFavor != null && golesEnContra != null) {
        if (golesAFavor > golesEnContra)          resultado = ResultadoPartido.VICTORIA;
        else if (golesAFavor.equals(golesEnContra)) resultado = ResultadoPartido.EMPATE;
        else                                        resultado = ResultadoPartido.DERROTA;
    }
}
```

### JWT HTTP Interceptor (auth.interceptor.ts)

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('coachlab_jwt');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```
