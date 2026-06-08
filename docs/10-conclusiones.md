# 10. Conclusions

## 10.1 Critical Evaluation Against Initial Objectives

### General Assessment

Overall, the development of CoachLab has been challenging. One of the main difficulties was self-organisation: without a structured day-to-day plan, it was easy to lose track of priorities and accumulate technical debt that only became visible later. This lack of organisation had a direct impact on the project: when attempting to expand certain features or make the implementation more robust and "professional", previously untested assumptions surfaced as real problems — in deployment configuration, in how the frontend communicated with the backend, and in the integration of external services. Despite these difficulties, the project reached a fully functional, publicly deployed state, which represents a meaningful outcome.

The degree of scope fulfilment is considered adequate. The core value proposition of the application — giving amateur coaches a tool to record matches, analyse team performance, and prepare for upcoming fixtures — has been delivered. However, an honest comparison against the original proposal reveals areas where the final product fell short of what was initially planned.

### Comparison Against the Project Proposal

The original proposal defined several specific features that were either simplified or not implemented:

| Proposed Feature | Final State | Notes |
|---|---|---|
| MySQL relational database | Implemented | An early prototype used H2, but the final product uses MySQL 8 in every runtime (managed on Aiven in production), with H2 kept only for the test suite. |
| User roles (coach / scout) | Implemented | Two roles — ENTRENADOR (manages the squad) and OJEADOR (read-only, compares squads) — with role-based authorisation in the API. |
| Real-time match event registration (quick-action buttons during a live match) | Not implemented | The final implementation uses a post-match form to enter the scoreline and per-player statistics. The live, in-match capture system was the most significant feature cut. |
| Automatic match import from football-data.org | Partially implemented | Importing a team now also stores its recent matches with the real scoreline. Per-player statistics are not available on the free API tier, and the full calendar/standings import was not built. |
| Multiple teams per user account | Not implemented | Deprioritised in favour of delivering a reliable single-team experience. Documented as a future improvement. |
| PDF/CSV export | Not implemented | Listed as optional in the proposal; not addressed in this version. |

### What Was Delivered

Despite the gaps above, the following core objectives were met:

| Objective | Status | Notes |
|---|---|---|
| JWT authentication with roles | Achieved | Register, login, logout; ENTRENADOR/OJEADOR roles with role-based authorisation |
| Team creation (manual and API import) | Achieved | Both methods work end-to-end in production; API import also stores recent matches |
| Squad management | Achieved | Full CRUD for players with validation (position, dorsal 1–99, alphabetic names) |
| Match registration with automatic result | Achieved | `@PrePersist` hook calculates WIN/DRAW/LOSS; per-player statistics including starts |
| IRE calculation and display | Achieved | Composite metric displayed on dashboard with verbal description |
| Match prediction + squad comparator | Achieved | IRE-based probabilities and a scout comparator (app and API teams) |
| MySQL database (Aiven in production) | Achieved | MySQL in all runtimes; H2 only for tests |
| Cloud deployment (Render), Docker, GitHub Actions CI | Achieved | Static-site frontend + Dockerised backend; CI tests on PR, image build/push on `main` |

The result is a functional application that covers the analytical core of the proposal — team performance tracking, statistical indicators, and pre-match planning — even if the data capture layer is less automated than originally envisioned.

## 10.2 Degree of Scope Fulfilment

The proposed scope has been delivered in its entirety. Beyond the stated objectives, several additional elements were implemented during development:

- A **GlobalExceptionHandler** providing consistent error responses across all endpoints.
- A **football-data.org proxy** that shields the API key from the browser and centralises external API error handling.
- A **player impact ranking** that aggregates per-match statistics into a composite score.
- A **landing page** with a complete marketing presentation of the product.
- **Docker Compose** orchestration for a fully reproducible local development environment.
- **GitHub Actions CI** with separate frontend and backend test jobs (on pull requests) and an image build/publish workflow (on `main`).
- A **squad comparator** for the scout role, able to compare app teams and football-data.org teams.
- A **Swagger/OpenAPI** contract for the REST API.

The main originally planned element that was simplified is the **multi-team per user** feature, which was deprioritised in favour of delivering a higher quality single-team experience. This is documented as a future improvement.

## 10.3 Proposed Future Improvements

### Short Term (immediate next steps)

**1. Versioned database migrations**
Add Flyway or Liquibase on top of the current MySQL setup and switch `ddl-auto` from
`update` to `validate` in production. This would give a traceable, reproducible schema
history instead of relying on Hibernate to evolve the schema automatically.

**2. Password recovery**
Implement a standard "Forgot password" flow via email using Spring Mail and a token-based reset link. Currently users cannot recover lost passwords.

**3. Multi-team per user account**
Allow a coach to manage more than one team from the same account, with a team-switcher in the navigation. This would make CoachLab useful for coaches who manage multiple squads simultaneously.

**4. Export to PDF/CSV**
Allow the coach to export the season summary, match history, and squad list as PDF or CSV, useful for presenting data to club management.

### Medium Term

**5. Finer-grained, per-team permissions**
The application already has account-level roles (coach / scout). A natural extension is
per-team membership with finer permission levels (head coach, assistant coach, analyst),
allowing several people to collaborate on the same squad.

**6. Mobile application**
Develop an Android/iOS companion app using Angular with Capacitor or a dedicated React Native/Flutter application, allowing coaches to record matches directly from the touchline.

**7. Full calendar and standings import from football-data.org**
Importing a team already brings in its recent matches with the real scoreline. A further
step would be to import the full season calendar, league standings and per-player match
statistics (the latter requires a paid API tier).

**8. Video annotation**
Integrate a lightweight video player with annotation tools, allowing coaches to tag specific moments in match recordings and link them to player statistics.

### Long Term

**9. AI-assisted tactical recommendations**
Use match data to generate automated tactical suggestions (e.g. "your team concedes 70% of goals in the last 15 minutes — consider substitution patterns").

**10. SaaS monetisation**
Introduce a freemium model: free tier for one team and basic statistics, paid tier for multiple teams, advanced analytics, and export features.

## 10.4 Lessons Learned

### Technical Lessons

**1. Database choice is an infrastructure decision, not a code decision.**
Starting with H2 file mode was convenient for early development but created real problems in the cloud environment (disk persistence, free-tier instance cycling), which is why the project migrated to MySQL (managed on Aiven). The lesson: choose the production database from day one — even if it means a slightly more complex initial setup — to save significant debugging time later.

**2. Circular dependencies indicate design problems.**
The circular bean dependency between `SecurityConfig` and `JwtAuthenticationFilter` was a symptom of violating the Single Responsibility Principle: `SecurityConfig` was trying to own both the security configuration and the user loading logic. Extracting `UserDetailsServiceImpl` was not just a workaround — it was the correct design.

**3. API design and JSON serialisation must be considered together.**
The `LazyInitializationException` problems with Jackson serialising JPA entities exposed a fundamental mismatch: JPA entities designed for lazy loading do not map cleanly to JSON representations. Using `@JsonIgnore` is a pragmatic fix, but the more principled solution is to use separate DTO classes for API responses, keeping the persistence model decoupled from the API contract.

**4. External services must be treated as unreliable.**
The football-data.org API returns 401 (missing key), 429 (rate limit exceeded), and occasional 5xx errors. Without proper error handling in `WebClient`, these became generic 500 errors with no useful message. The `onStatus()` operator approach ensures that external API errors are propagated with meaningful HTTP status codes to the frontend.

**5. Cloud deployment configuration requires its own testing strategy.**
The most time-consuming issues in this project were not coding problems but deployment configuration problems: the Docker build context, nginx hostname resolution, CORS policy, and Angular production environment variables. These are hard to reproduce locally and require iterative testing in the real cloud environment. A dedicated staging environment and deployment checklists would have saved significant time.

**6. Angular's `@for` track expression is not optional.**
NG0955 duplicate key errors are silent data bugs in disguise. Always tracking by a genuinely unique identifier (database ID, not user-visible code or label) prevents rendering corruption with minimal overhead.

### Process Lessons

**7. Documentation should be written incrementally, not at the end.**
Writing documentation after the fact requires reconstructing decisions and rationale from memory. Architecture decisions (the circular dependency fix, the `@JsonIgnore` strategy, the WebClient choice) would have been clearer and more useful if documented at the moment they were made, as Architecture Decision Records (ADRs).

**8. The deployment environment should be set up as early as possible.**
In this project, deployment was addressed near the end of development. Many of the most difficult bugs were specific to the production environment (Render's build context behaviour, nginx inter-service resolution). Setting up a working deployment pipeline early — even with a placeholder application — would have caught these issues much sooner.

**9. Scope discipline is a feature.**
The decision to deliver one team per user well, rather than rushing multi-team support, resulted in a more polished, reliable product. Identifying which features are "core" and which are "nice to have" is a skill as important as any technical skill.
