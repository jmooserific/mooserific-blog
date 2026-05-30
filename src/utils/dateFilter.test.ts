import { describe, it, expect } from 'vitest';
import { matchesDateFilter } from './dateFilter';

describe('matchesDateFilter', () => {
  it('matches everything when the filter is empty', () => {
    expect(matchesDateFilter('2026-05-30T10:00:00', '')).toBe(true);
  });

  it('matches a year filter', () => {
    expect(matchesDateFilter('2026-05-30T10:00:00', '2026')).toBe(true);
    expect(matchesDateFilter('2025-05-30T10:00:00', '2026')).toBe(false);
  });

  it('matches a year-month filter', () => {
    expect(matchesDateFilter('2026-05-30T10:00:00', '2026-05')).toBe(true);
    expect(matchesDateFilter('2026-06-30T10:00:00', '2026-05')).toBe(false);
  });

  it('matches a full-date filter', () => {
    expect(matchesDateFilter('2026-05-30T10:00:00', '2026-05-30')).toBe(true);
    expect(matchesDateFilter('2026-05-31T10:00:00', '2026-05-30')).toBe(false);
  });

  it('matches a minute-precision filter, normalizing separators', () => {
    expect(matchesDateFilter('2026-05-30 10:15:00', '2026-05-30T10-15')).toBe(true);
    expect(matchesDateFilter('2026-05-30 10:16:00', '2026-05-30T10-15')).toBe(false);
  });

  it('returns false for an unrecognized filter shape', () => {
    expect(matchesDateFilter('2026-05-30T10:00:00', 'not-a-date')).toBe(false);
  });
});
