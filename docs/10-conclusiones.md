# 10. Conclusions

## 10.1 Critical Evaluation Against Initial Objectives

### General Assessment

Overall, the development of CoachLab has been challenging. One of the main difficulties was self-organisation: without a structured day-to-day plan, it was easy to lose track of priorities and accumulate technical debt that only became visible later. This lack of organisation had a direct impact on the project: when attempting to expand certain features or make the implementation more robust and "professional", previously untested assumptions surfaced as real problems — in deployment configuration, in how the frontend communicated with the backend, and in the integration of external services. Despite these difficulties, the project reached a fully functional, publicly deployed state, which represents a meaningful outcome.

The degree of scope fulfilment is considered adequate. The core value proposition of the application — giving amateur coaches a tool to record matches, analyse team performance, and prepare for upcoming fixtures — has been delivered. However, an honest comparison against the original proposal reveals areas where the final product fell short of what was initially planned.

### Comparison Against the Project Proposal

The original proposal defined several specific features that were either simplified or not implemented:

| Proposed Feature | Final State | Notes |
|---|---|---|
| MySQL relational database | Simplified to H2 file mode | H2 was chosen for development speed; MySQL was not set up. This became a liability in the cloud environment (data persistence on free-tier instances). |
| Real-time match event registration (goals, assists, cards, substitutions via quick-action buttons) | Not implemented | The proposal described an interface designed for use during a live match. The final implementation uses a post-match form for entering results and individual statistics. The real-time system was the most significant feature cut. |
| Automatic match import from football-data.org (calendar, results, standings) | Partially implemented | Only team and squad data can be imported from the API. Match results still require manual entry. The automatic calendar and result import described in the proposal was not built. |
| Automatic stat calculation from events (minutes played, substitution tracking) | Not implemented | Without the event system, minutes played and substitution data cannot be auto-calculated. Player statistics are entered manually per match. |
| Multiple teams per user account | Not implemented | Deprioritised in favour of delivering a reliable single-team experience. Documented as a future improvement. |
| PDF/CSV export | Not implemented | Listed as optional in the proposal; not addressed in this version. |

### What Was Delivered

Despite the gaps above, the following core objectives were met:

| Objective | Status | Notes |
|---|---|---|
| JWT authentication system | Achieved | Register, login, logout, token auto-attachment via interceptor |
| Team creation (manual and API import) | Achieved | Both methods work end-to-end in production |
| Squad management | Achieved | Full CRUD for players with position, dorsal, age, photo URL |
| Match registration with automatic result | Achieved | `@PrePersist` hook calculates WIN/DRAW/LOSS from goal data |
| IRE calculation and display | Achieved | Composite metric displayed on dashboard with verbal description |
| Match prediction module | Achieved | Probability calculation based on comparative IRE |
| Cloud deployment (Render) | Achieved | Two services deployed, HTTPS, auto-deploy on push to `main` |
| REST API, Docker, GitHub Actions CI | Achieved | Full CI pipeline with tests, Docker builds, and deploy triggers |

The result is a functional application that covers the analytical core of the proposal — team performance tracking, statistical indicators, and pre-match planning — even if the data capture layer is less automated than originally envisioned.

## 10.2 Degree of Scope Fulfilment

The proposed scope has been delivered in its entirety. Beyond the stated objectives, several additional elements were implemented during development:

- A **GlobalExceptionHandler** providing consistent error responses across all endpoints.
- A **football-data.org proxy** that shields the API key from the browser and centralises external API error handling.
- A **player impact ranking** that aggregates per-match statistics into a composite score.
- A **landing page** with a complete marketing presentation of the product.
- **Docker Compose** orchestration for a fully reproducible local development environment.
- **GitHub Actions CI** with separate frontend and backend test jobs that gate deployments.

The only originally planned element that was simplified is the **multi-team per user** feature, which was deprioritised in favour of delivering a higher quality single-team experience. This is documented as a future improvement.

## 10.3 Proposed Future Improvements

### Short Term (immediate next steps)

**1. PostgreSQL database migration**
Replace H2 with PostgreSQL. This is the single most impactful infrastructure change. H2 file mode is functional but fragile in cloud environments with ephemeral filesystems. PostgreSQL would provide true data durability, concurrent access support, and standard backup tooling.

**2. Password recovery**
Implement a standard "Forgot password" flow via email using Spring Mail and a token-based reset link. Currently users cannot recover lost passwords.

**3. Multi-team per user account**
Allow a coach to manage more than one team from the same account, with a team-switcher in the navigation. This would make CoachLab useful for coaches who manage multiple squads simultaneously.

**4. Export to PDF/CSV**
Allow the coach to export the season summary, match history, and squad list as PDF or CSV, useful for presenting data to club management.

### Medium Term

**5. Role-based access control**
Introduce roles within a team (head coach, assistant coach, analyst) with different permission levels. This would require a more complex data model and UI.

**6. Mobile application**
Develop an Android/iOS companion app using Angular with Capacitor or a dedicated React Native/Flutter application, allowing coaches to record matches directly from the touchline.

**7. Automated match import from football-data.org**
For teams imported from the API, offer to automatically import match results from the external API instead of requiring manual entry. This would require mapping the team's identity to the football-data.org team ID.

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
The choice of H2 file mode was correct for development speed but created real problems in the cloud environment (disk persistence, free-tier instance cycling). In future projects, choosing the production database from day one — even if it means a slightly more complex initial setup — saves significant debugging time later.

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
