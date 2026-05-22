# 7. Testing

## 7.1 Testing Methodology

CoachLab uses a pragmatic testing approach focused on verifying that each component and service works correctly in isolation and in integration with the real environment. The project does not follow strict TDD (Test-Driven Development), but tests were written alongside each feature, informed by the failures encountered during development.

## 7.2 Types of Tests Performed

### 7.2.1 Backend — Unit Tests (Spring Boot)

The backend tests use:
- **JUnit 5** as the test framework.
- **Spring Boot Test** (`@SpringBootTest`) for integration tests with the full application context.
- **MockMvc** for testing REST controller endpoints without starting a full HTTP server.
- **H2 in-memory mode** as the test database (automatically configured by Spring Boot Test).

Test classes are located in `backend/coachlab-springboot/coachlab/src/test/`.

The CI workflow runs backend tests with:
```bash
mvn test
```

### 7.2.2 Frontend — Unit Tests (Angular)

The frontend tests use:
- **Jasmine** as the test framework.
- **Karma** as the test runner.
- **Angular TestBed** for component and service testing.

Test files follow the Angular convention of `*.spec.ts` co-located with each component or service.

The CI workflow runs frontend tests with:
```bash
npm test
```

Key test file: `football-data.service.spec.ts`, which verifies that the `FootballDataService` constructs the correct API URLs for competitions, teams, and squad endpoints.

### 7.2.3 Manual Integration Testing

End-to-end functional testing was performed manually in the browser against both the local Docker Compose environment and the production Render deployment.

The test scenarios covered:

| Test ID | Scenario | Expected Result |
|---|---|---|
| T-01 | Register a new account | JWT token returned; redirect to Setup |
| T-02 | Login with valid credentials | JWT stored; redirect to Dashboard |
| T-03 | Login with invalid credentials | 401 error message shown |
| T-04 | Create team manually | Team saved; redirect to player addition |
| T-05 | Import team from football-data.org | Competitions list loaded; team imported |
| T-06 | Add player to squad | Player appears in squad list |
| T-07 | Register a match (win) | Match saved; result shows VICTORIA |
| T-08 | Register a match (draw) | Result shows EMPATE |
| T-09 | View dashboard after 3 matches | KPI cards show correct totals; IRE calculated |
| T-10 | Request match prediction | Win/draw/loss probabilities displayed |
| T-11 | Access protected route without JWT | Redirect to login page |
| T-12 | JWT expiry simulation | Session cleared; redirect to login |

## 7.3 CI Test Execution

The GitHub Actions workflow (`.github/workflows/docker-image.yml`) runs both frontend and backend tests automatically on every push and pull request targeting `main`.

```yaml
test-frontend:
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4 (node 20)
    - run: npm ci
    - run: npm test

test-backend:
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4 (Java 17, temurin)
    - run: mvn test
```

A deployment to production only proceeds if both test jobs pass.

## 7.4 Test Coverage

Automated test coverage is partial, focused on the most critical paths:

| Area | Coverage type | Notes |
|---|---|---|
| `FootballDataService` | Unit (Angular) | URL construction for all proxy endpoints |
| `AuthController` | Integration (Spring) | Register and login happy path |
| `AnalisisService` | Manual | IRE formula verified against known inputs |
| `Partido.calcularResultado()` | Manual | Win/draw/loss assignment |
| Component rendering | Manual (browser) | Verified in both dev and production environments |

## 7.5 Known Limitations

- No end-to-end (E2E) testing framework (e.g. Cypress or Playwright) is configured. All cross-service interaction was validated manually.
- Frontend component tests have limited coverage; most Angular testing relies on the manually verified behaviour in the browser.
- The IRE formula is validated through manual spot-checks rather than automated assertions over a test dataset.
