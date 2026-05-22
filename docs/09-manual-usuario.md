# 9. User Manual

## 9.1 Accessing the Application

CoachLab is available at: **https://coachlab-futbol-eeiq.onrender.com**

No installation is required. The application runs entirely in the browser and is compatible with any modern browser (Chrome, Firefox, Edge, Safari).

**Important note (free tier):** The first request after a period of inactivity may take up to 30 seconds while the backend wakes up. This is normal behaviour on Render's free tier.

## 9.2 Creating an Account

1. Open the application URL. You will see the landing page with a "Get started" call to action.
2. Click **Get started** or the **Login / Register** button in the navigation bar.
3. In the authentication panel, select the **Register** tab.
4. Enter your full name, email address, and a password.
5. Click **Create account**.
6. On success, you will be redirected automatically to the Setup page to configure your first team.

## 9.3 Logging In

1. Open the application and click **Login / Register**.
2. Enter your registered email and password.
3. Click **Sign in**.
4. You will be redirected to the Dashboard if you have already set up a team, or to the Setup page if this is your first login.

## 9.4 Setting Up Your Team

The Setup page is shown once, the first time you log in. You can choose between two methods:

### Method 1 — Manual Creation

1. Click **Create manually**.
2. Enter the team name (required), category (e.g. "Regional Preferente"), season (e.g. "2024/2025"), and city.
3. Click **Create team**.
4. You will be prompted to add players. You can add them now or click **Add later** to go directly to the dashboard.

### Method 2 — Import from football-data.org

1. Click **Connect** under the football-data.org option.
2. The application loads all available professional competitions. Select a competition (e.g. "Primera Division").
3. The teams in that competition are displayed. Select your team.
4. Click **Confirm team**. The team data is imported.
5. After import, you can add players manually through the Squad page.

## 9.5 Managing Your Squad

Navigate to the **Squad** (Plantilla) section using the sidebar.

### Adding a Player

1. Click **Add player** (or the "+" button).
2. Fill in the form: first name (required), last name, squad number, position, age, photo URL.
3. Click **Save**.

### Editing a Player

1. Click the edit button next to a player's name.
2. Modify the desired fields.
3. Click **Save changes**.

### Removing a Player

1. Click the delete button next to a player's name.
2. Confirm the action.

### Player Impact Ranking

The ranking tab shows all players sorted by their impact score, calculated from accumulated match statistics (goals, assists, yellow cards, red cards).

## 9.6 Recording a Match

Navigate to **Register Match** (Registrar Partido).

1. Fill in the match details:
   - **Date**: The date the match was played.
   - **Opponent**: The name of the opposing team.
   - **Home / Away**: Select whether you played at home or away.
   - **Goals scored**: Goals your team scored.
   - **Goals conceded**: Goals the opponent scored.
   - **Notes**: Optional coach observations about the match.
2. Click **Save match**. The result (WIN/DRAW/LOSS) is calculated automatically.
3. Optionally, add individual player statistics for this match (minutes played, goals, assists, yellow cards, red cards).

## 9.7 Using the Dashboard

Navigate to **Dashboard** using the sidebar.

The dashboard displays:

- **KPI cards**: Total matches, wins, draws, losses, total goals scored and conceded, goal averages.
- **IRE (Team Performance Index)**: A score from 0 to 10 reflecting overall team performance.
  - 8–10: Excellent
  - 6–8: Good
  - 4–6: Average
  - 2–4: Below average
  - 0–2: Poor
- **Recent form**: The results of the last 5 matches shown as W/D/L badges.
- **Performance chart**: A visual representation of goals over the season.

The dashboard updates automatically each time you log in or refresh the page after recording a new match.

## 9.8 Using Pre-Match Planning

Navigate to **Pre-Match** (Prepartido).

1. Select the opposing team from the available list.
2. The system calculates the probability of WIN, DRAW, or LOSS based on the IRE of both teams, including a home advantage factor.
3. Use this information to inform your tactical preparation.

Note: The prediction is based purely on statistical data recorded in CoachLab. The more matches you have recorded, the more accurate the prediction.

## 9.9 Browsing Professional Leagues

Navigate to **Liga**.

1. Select a competition from the list (Premier League, La Liga, Serie A, etc.).
2. Browse the clubs in that competition.
3. Select a club to view its squad and recent match data from football-data.org.

This section is useful as a reference for tactical analysis or when preparing for a match against a team that plays a style similar to a professional club.

## 9.10 Logging Out

Click your user name or the logout icon in the navigation bar and select **Log out**. Your session will be cleared immediately.

## 9.11 Frequently Asked Questions

**Q: I forgot my password. How do I reset it?**
A: Password recovery is not yet implemented. Contact the application administrator or register a new account with a different email address.

**Q: Can I manage more than one team?**
A: The current version is designed for one team per user account. Multi-team support is planned for a future version.

**Q: The application is very slow to load for the first time.**
A: This is expected behaviour. CoachLab is hosted on Render's free tier, which puts services to sleep after 15 minutes of inactivity. The first request wakes the service, which takes 20–30 seconds. Subsequent requests are fast.

**Q: The football-data.org competition list is not loading.**
A: This can happen if the API key quota has been exceeded (free tier limit: 10 requests/minute) or if the external service is temporarily unavailable. Wait a minute and try again.

**Q: My match data disappeared after logging in again.**
A: Data is stored in a persistent H2 database file on the server. If a redeployment occurred on a new Render instance, the disk may not have been remounted. This is a known limitation of the free tier. Consider exporting important data manually.
