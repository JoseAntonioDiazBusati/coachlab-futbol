/**
 * Utilities for computing the current football season.
 *
 * Football seasons run August → May.  If today's month is before August we are
 * still in the season that *started* the previous calendar year.
 *
 * Examples (May 2026, month = 5 < 8):
 *   getCurrentSeason()     → "2025/2026"
 *   getCurrentSeasonYear() → 2025
 *
 * Examples (September 2026, month = 9 >= 8):
 *   getCurrentSeason()     → "2026/2027"
 *   getCurrentSeasonYear() → 2026
 */

/**
 * Returns the display name of the current football season, e.g. "2025/2026".
 */
export function getCurrentSeason(): string {
  const now   = new Date();
  const month = now.getMonth() + 1;   // 1-based
  const year  = now.getFullYear();
  const start = month >= 8 ? year : year - 1;
  return `${start}/${start + 1}`;
}

/**
 * Returns the *start* year of the current football season.
 * This is the value expected by football-data.org `?season=` query parameter.
 *
 * Examples: May 2026 → 2025 ;  September 2026 → 2026
 */
export function getCurrentSeasonYear(): number {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  return month >= 8 ? year : year - 1;
}
