import { describe, it, expect } from 'vitest';
import { slugFromDate, isValidSlug, nextAvailableSlug } from './slug';

describe('slugFromDate', () => {
  it('derives YYYY-MM-DD-HHMM in UTC', () => {
    expect(slugFromDate('2026-05-31T14:30:00.000Z')).toBe('2026-05-31-1430');
  });

  it('zero-pads month, day, hour, and minute', () => {
    expect(slugFromDate('2026-01-05T04:07:00.000Z')).toBe('2026-01-05-0407');
  });

  it('uses UTC, not local time', () => {
    // Midnight UTC regardless of the runner's timezone.
    expect(slugFromDate('2026-12-09T00:00:00.000Z')).toBe('2026-12-09-0000');
  });

  it('throws on an unparseable date', () => {
    expect(() => slugFromDate('not-a-date')).toThrow();
  });
});

describe('isValidSlug', () => {
  it('accepts the date-derived format', () => {
    expect(isValidSlug('2026-05-31-1430')).toBe(true);
  });

  it('accepts lowercase words separated by single hyphens', () => {
    expect(isValidSlug('summer-at-the-lake')).toBe(true);
  });

  it('rejects empty, uppercase, spaces, and stray hyphens', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('Summer')).toBe(false);
    expect(isValidSlug('summer lake')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('double--hyphen')).toBe(false);
  });

  it('rejects slugs over the length cap', () => {
    expect(isValidSlug('a'.repeat(121))).toBe(false);
  });
});

describe('nextAvailableSlug', () => {
  it('returns the base when it is free', () => {
    expect(nextAvailableSlug('2026-05-31-1430', [])).toBe('2026-05-31-1430');
  });

  it('appends -2 on the first collision', () => {
    expect(nextAvailableSlug('2026-05-31-1430', ['2026-05-31-1430'])).toBe('2026-05-31-1430-2');
  });

  it('skips already-taken numbered suffixes', () => {
    const taken = ['2026-05-31-1430', '2026-05-31-1430-2', '2026-05-31-1430-3'];
    expect(nextAvailableSlug('2026-05-31-1430', taken)).toBe('2026-05-31-1430-4');
  });

  it('accepts a Set as well as an array', () => {
    expect(nextAvailableSlug('a', new Set(['a']))).toBe('a-2');
  });
});
