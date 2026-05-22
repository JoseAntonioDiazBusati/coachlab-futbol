# 2. Description

## 2.1 Main Functionalities

### 2.1.1 User Authentication

CoachLab implements a complete stateless authentication system based on JSON Web Tokens (JWT).

- **Registration**: A new user provides their name, email address, and password. The password is stored hashed using BCrypt. On success, the backend returns a JWT token.
- **Login**: The user authenticates with email and password. On success, a JWT token is returned and stored in the browser's `localStorage`.
- **Session management**: All subsequent requests to protected endpoints include the JWT in the `Authorization: Bearer <token>` header, managed automatically by an Angular HTTP interceptor.
- **Logout**: The token is removed from `localStorage`, ending the session without any server-side call.

### 2.1.2 Initial Setup — Team Creation

When a user authenticates for the first time, they are redirected to the Setup page, which offers two methods for creating a team:

**Method 1 — Manual creation:**
The user enters the team name (required), category, season, and city. After creation, they are prompted to add players to the squad immediately.

**Method 2 — Import via football-data.org API:**
The user browses the available professional competitions (La Liga, Premier League, Bundesliga, etc.), selects a competition, browses its clubs, and selects one. The application imports the team's basic data from the external API.

### 2.1.3 Squad Management

The Squad (Plantilla) page displays all players registered for the team. For each player, the following attributes are stored:

- First name (required)
- Last name
- Squad number (dorsal)
- Position (Goalkeeper, Defender, Midfielder, Forward)
- Age
- Photo URL

The coach can add new players, edit existing ones, and remove players from the squad.

A **Player Impact Ranking** is available, which sorts players by a composite impact score based on their individual match statistics (goals, assists, yellow cards, red cards).

### 2.1.4 Match Registration

The Match Registration page allows the coach to record the details of each match played:

- Date
- Opponent name
- Home or away
- Goals scored and conceded
- Coach notes (observations)

The result (WIN, DRAW, LOSS) is calculated automatically by the backend based on the goal data.

Individual player statistics can be associated with each match:
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

The Liga page allows the coach to browse professional competitions available via the football-data.org API, view the clubs in each competition, and explore squad data of professional teams as a reference.

## 2.2 User Interface and User Experience

CoachLab follows a dark-themed design with green accent colours, consistent with the visual language of sports analytics platforms. The design principles applied are:

- **Mobile-first**: Although primarily used on desktop, all layouts are responsive.
- **Single Page Application**: Navigation between sections does not reload the page. Angular Router handles client-side routing.
- **Minimal cognitive load**: Each page has a single clear purpose. KPIs are presented as cards with large, prominent numbers.
- **Progressive disclosure**: The setup wizard guides new users step by step. Advanced features (player statistics per match) are accessible but not forced on the user.

The application uses the **Outfit** font for headings and **Inter** for body text, both served via Google Fonts.

## 2.3 Target Users and Use Cases

### Target Users

The primary target user is an **amateur or youth football coach** who:
- Manages a team at regional, youth, or veterans level.
- Has basic digital literacy but is not a technical specialist.
- Currently tracks data manually or in a spreadsheet.
- Wants objective data to support tactical decisions.

### Primary Use Cases

| Use Case | Actor | Description |
|---|---|---|
| UC-01 | Coach | Register and create a team |
| UC-02 | Coach | Import a professional team from football-data.org |
| UC-03 | Coach | Add players to the squad |
| UC-04 | Coach | Record a match result with player statistics |
| UC-05 | Coach | View team performance KPIs on the dashboard |
| UC-06 | Coach | Consult the IRE before a match against a known opponent |
| UC-07 | Coach | Browse professional leagues for tactical reference |
