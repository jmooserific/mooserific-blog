import { describe, it, expect } from 'vitest';
import { deriveTitle, formatDate } from './postTitle';

const DATE = '2026-05-31T14:30:00.000Z';

describe('formatDate', () => {
  it('formats an ISO date in UTC', () => {
    expect(formatDate(DATE)).toBe('May 31, 2026');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('deriveTitle', () => {
  it('uses the first non-empty line of the caption', () => {
    expect(deriveTitle('A day at the lake\nmore text', DATE)).toBe('A day at the lake');
  });

  it('skips leading blank lines', () => {
    expect(deriveTitle('\n\n  Real title  \nbody', DATE)).toBe('Real title');
  });

  it('strips a leading Markdown heading marker', () => {
    expect(deriveTitle('## Birthday party', DATE)).toBe('Birthday party');
  });

  it('strips emphasis, code, quote, and strike markers', () => {
    expect(deriveTitle('*Hello* `there` ~~old~~ > quote #tag', DATE)).toBe('Hello there old  quote tag');
  });

  it('truncates long titles to 70 chars with an ellipsis', () => {
    const long = 'x'.repeat(100);
    const title = deriveTitle(long, DATE);
    expect(title).toHaveLength(70); // 69 chars + ellipsis
    expect(title.endsWith('…')).toBe(true);
  });

  it('falls back to the formatted date when the caption is undefined', () => {
    expect(deriveTitle(undefined, DATE)).toBe('May 31, 2026');
  });

  it('falls back to the date when the caption is only whitespace', () => {
    expect(deriveTitle('   \n  ', DATE)).toBe('May 31, 2026');
  });

  it('falls back to the date when the caption is only Markdown markers', () => {
    expect(deriveTitle('***', DATE)).toBe('May 31, 2026');
  });
});
