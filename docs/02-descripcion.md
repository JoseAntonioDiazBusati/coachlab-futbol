# 2. Description

## 2.1 Main Functionalities

### 2.1.1 User Authentication

CoachLab implements a complete stateless authentication system based on JSON Web Tokens (JWT).

- **Registration**: A new user provides their name, email address, and password. The password is stored hashed using BCrypt. On success, the backend returns a JWT token.
- **Login**: The user authenticates with email and password. On success, a JWT token is returned and stored in the browser's `localStorage`.
- **Session management**: All subsequent requests to protected endpoints include the JWT in the `Authorization: Bearer <token>` header, managed automatically by an Angular HTTP interceptor.
- **Logout**: The token is removed from `localStorage`, ending the session without any server-side call.
- **Roles**: each account has a role — **ENTRENADOR** (coach), who manages their own squad and matches, or **OJEADOR** (scout), a read-only role that compares squads. Write operations are restricted to coaches (a scout receives `403`); the JWT carries the role as a claim.

### 2.1.2 Initial Setup — Team Creation

When a user logs in, they are redirected to their dashboard if they already have a team, or to the **Ligas** page otherwise, which offers two methods for creating a team:

**Method 1 — Manual creation:**
The user enters the team name (required), category, season, and city. After creation, they are prompted to add players to the squad immediately.

**Method 2 — Import via football-data.org API:**
The user browses the available professional competitions (La Liga, Premier League, Bundesliga, etc.), selects a competition, browses its clubs, and selects one. The application imports the team's basic data from the external API.

### 2.1.3 Squad Management

The Squad (Plantilla) page displays all players registered for the team. For each player, the following attributes are stored:

- First name (required, letters only)
- Last name (letters only)
- Squad number (dorsal, between 1 and 99)
- Position (Goalkeeper, Defender, Midfielder, Forward)
- Age (positive)

Forms are validated both on the client and the server (alphabetic names, dorsal 1–99,
positive age). The coach can add new players, edit existing ones, and remove players from the squad.

A **Player Impact Ranking** is available, which sorts players by a composite impact score based on their individual match statistics (goals, assists, yellow cards, red cards).

### 2.1.4 Match Registration

The Match Registration page allows the coach to record the details of each match played:

- Date
- Opponent name
- Home or away
- Goals scored and conceded
- Coach notes (observations)

The result (WIN, DRAW, LOSS) is calculated automatically by the backend based on the goal data.

Individual player statistics are recorded within the same match screen:
- Starter (titularidad)
- Minutes played
- Goals
- Assists
- Yellow cards
- Red cards

### 2.1.5 Dashboard

The dashboard is the central hub of the application, providing a summary of team performance:

**KPI Cards:**
- Matches played / Wins / Draws / Losses
- Total goals scored and conceded
- Average goals per match (for and against)
- IRE (Team Performance Index) — the headline metric

**IRE (Team Performance Index):**
The IRE is a proprietary composite metric calculated by the backend's `AnalisisService`:

```
IRE = (wins × 3 + draws × 1) / (total × 3) × 0.7
    + normalised_goal_difference × 0.3
```

The result is normalised to a 0–10 scale. A score of 8+ indicates excellent performance; below 2 indicates very poor performance.

**Recent Form:**
A visual display of the results from the last 5 matches (W/D/L streak).

**Performance Chart:**
A chart visualising goal trends across the season.

### 2.1.6 Pre-Match Planning

The Pre-Match (Prepartido) page provides a match prediction tool. The coach selects an opponent team, and the system calculates win/draw/loss probabilities based on the comparative IRE of both teams, including a home advantage factor (approximately 10%, consistent with historical football statistics).

### 2.1.7 Liga Page

The Liga page allows the coach to browse professional competitions available via the football-data.org API, view the clubs in each competition, and import a team (its squad and recent matches with the real scoreline) into the application.

### 2.1.8 Squad Comparator (Scout)

The **OJEADOR** (scout) role has a comparator that places two squads side by side.
Each side can be either a team registered in the application or a professional team
fetched from the football-data.org API, which lets the scout compare line-ups and
rosters beyond their own organisation (read-only).

## 2.2 User Interface and User Experience

CoachLab follows a dark-themed design with green accent colours, consistent with the visual language of sports analytics platforms. The design principles applied are:

- **Mobile-first**: Although primarily used on desktop, all layouts are responsive.
- **Single Page Application**: Navigation between sections does not reload the page. Angular Router handles client-side routing.
- **Minimal cognitive load**: Each page has a single clear purpose. KPIs are presented as cards with large, prominent numbers.
- **Progressive disclosure**: new users are guided to create or import a team from the Ligas page. Advanced features (per-match player statistics) are accessible but not forced on the user.

The application uses the **Outfit** font for headings and **Inter** for body text, both served via Google Fonts.

## 2.3 Target Users and Use Cases

### Target Users

There are two user profiles:

- **Coach (entrenador)** — an amateur or youth football coach who manages a team at
  regional, youth, or veterans level, has basic digital literacy, currently tracks
  data manually or in a spreadsheet, and wants objective data to support tactical decisions.
- **Scout (ojeador)** — a read-only profile that works alongside a coach and compares
  squads of other teams (from the app or from the API).

### Primary Use Cases

| Use Case | Actor | Description |
|---|---|---|
| UC-01 | Coach | Register and create a team |
| UC-02 | Coach | Import a professional team from football-data.org |
| UC-03 | Coach | Add players to the squad |
| UC-04 | Coach | Record a match result with player statistics |
| UC-05 | Coach | View team performance KPIs on the dashboard |
| UC-06 | Coach | Build the line-up and consult the match prediction |
| UC-07 | Coach | Browse and import professional leagues |
| UC-08 | Scout | Compare two squads side by side (app and/or API teams) |
