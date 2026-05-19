import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getCurrentSeason, getCurrentSeasonYear } from './temporada.utils';

describe('temporada utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // ── getCurrentSeasonYear ──────────────────────────────────────────────────

  describe('getCurrentSeasonYear()', () => {
    it('returns previous year when month is before August (May 2026 → 2025)', () => {
      vi.setSystemTime(new Date('2026-05-15'));
      expect(getCurrentSeasonYear()).toBe(2025);
    });

    it('returns previous year in January (Jan 2026 → 2025)', () => {
      vi.setSystemTime(new Date('2026-01-10'));
      expect(getCurrentSeasonYear()).toBe(2025);
    });

    it('returns previous year in July (Jul 2026 → 2025)', () => {
      vi.setSystemTime(new Date('2026-07-31'));
      expect(getCurrentSeasonYear()).toBe(2025);
    });

    it('returns current year in August (Aug 2026 → 2026)', () => {
      vi.setSystemTime(new Date('2026-08-01'));
      expect(getCurrentSeasonYear()).toBe(2026);
    });

    it('returns current year in September (Sep 2025 → 2025)', () => {
      vi.setSystemTime(new Date('2025-09-20'));
      expect(getCurrentSeasonYear()).toBe(2025);
    });

    it('returns current year in December (Dec 2026 → 2026)', () => {
      vi.setSystemTime(new Date('2026-12-25'));
      expect(getCurrentSeasonYear()).toBe(2026);
    });
  });

  // ── getCurrentSeason ─────────────────────────────────────────────────────

  describe('getCurrentSeason()', () => {
    it('returns "2025/2026" for May 2026', () => {
      vi.setSystemTime(new Date('2026-05-15'));
      expect(getCurrentSeason()).toBe('2025/2026');
    });

    it('returns "2025/2026" for January 2026', () => {
      vi.setSystemTime(new Date('2026-01-10'));
      expect(getCurrentSeason()).toBe('2025/2026');
    });

    it('returns "2025/2026" for July 2026', () => {
      vi.setSystemTime(new Date('2026-07-31'));
      expect(getCurrentSeason()).toBe('2025/2026');
    });

    it('returns "2026/2027" for August 2026', () => {
      vi.setSystemTime(new Date('2026-08-01'));
      expect(getCurrentSeason()).toBe('2026/2027');
    });

    it('returns "2025/2026" for September 2025', () => {
      vi.setSystemTime(new Date('2025-09-20'));
      expect(getCurrentSeason()).toBe('2025/2026');
    });

    it('season string has format "YYYY/YYYY"', () => {
      vi.setSystemTime(new Date('2025-10-01'));
      const s = getCurrentSeason();
      expect(s).toMatch(/^\d{4}\/\d{4}$/);
    });

    it('consecutive years differ by exactly one', () => {
      vi.setSystemTime(new Date('2025-10-01'));
      const [start, end] = getCurrentSeason().split('/').map(Number);
      expect(end - start).toBe(1);
    });
  });
});
