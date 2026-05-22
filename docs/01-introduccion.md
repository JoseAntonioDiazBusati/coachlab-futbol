# 1. Introduction, Objectives and Background

## 1.1 Origin and Motivation

CoachLab was born from a practical need observed in grassroots and amateur football: coaches at non-professional levels have no accessible, centralised tool to manage their squad, track match results, and obtain objective performance indicators about their team.

Professional clubs have access to advanced analytics platforms (Wyscout, InStat, etc.), but these are prohibitively expensive and overly complex for a regional or youth football coach. Most amateur coaches resort to spreadsheets, paper notes, or generic applications not designed for football, which results in fragmented data, loss of historical information, and a complete absence of analytical insight.

CoachLab aims to fill this gap by providing a web application that is simple enough to be used without technical training, yet powerful enough to offer real statistical value.

## 1.2 Project Objectives

### Primary Objective

Develop a functional web application that allows a football coach to manage their team, record match results, and consult statistical indicators, accessible from any modern browser without installation.

### Specific Objectives

- Implement a complete user authentication system (registration, login, JWT session management).
- Allow team creation either manually or by importing data from the football-data.org API.
- Provide a squad management module with individual player records.
- Enable match registration with automatic result calculation.
- Calculate and display the Team Performance Index (IRE — Índice de Rendimiento del Equipo), a proprietary composite metric.
- Offer a match prediction module based on the comparative IRE of two teams.
- Deploy the application in a publicly accessible cloud environment.
- Follow modern development practices: REST API, containerisation with Docker, CI with GitHub Actions.

### Secondary Objectives

- Build the frontend as a Single Page Application (SPA) to provide a fluid, native-app-like user experience.
- Keep infrastructure costs at zero using free-tier cloud services.
- Design a scalable architecture that could support future features such as multi-user roles, video analysis, or mobile applications.

## 1.3 Comparative Analysis of Similar Applications

| Application | Target audience | Price | Squad management | Match stats | API integration | Accessibility |
|---|---|---|---|---|---|---|
| **Wyscout** | Professional scouts | High (subscription) | Yes | Advanced | Yes | Web + App |
| **InStat** | Semi-professional clubs | Medium | Yes | Advanced | Yes | Web |
| **Spond** | Amateur teams | Free (basic) | Yes | No | No | Web + App |
| **TeamSnap** | Amateur teams | Freemium | Yes | Basic | No | Web + App |
| **Google Sheets** | General | Free | Manual | Manual | No | Web |
| **CoachLab** | Amateur/youth coaches | Free | Yes | IRE + predictions | football-data.org | Web |

CoachLab occupies a unique position: it is the only option in this comparison that combines free access, football-specific statistical analysis (IRE), and integration with an external data source for professional team reference.

The key differentiator is the IRE (Team Performance Index), a composite metric calculated from match results and goal difference that gives the coach an objective, normalised score (0–10) representing team performance at a glance.
