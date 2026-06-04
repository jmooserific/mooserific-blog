import { describe, expect, it } from 'vitest';
import { shouldLeadWithHero } from './heroLayout';

const landscape = { width: 1600, height: 1067 };
const square = { width: 1000, height: 1000 };
const portrait = { width: 1067, height: 1600 };

describe('shouldLeadWithHero', () => {
  it('returns false for a post with no photos (e.g. video-only)', () => {
    expect(shouldLeadWithHero([])).toBe(false);
  });

  it('heroes a single landscape photo', () => {
    expect(shouldLeadWithHero([landscape])).toBe(true);
  });

  it('heroes a single square photo (width === height counts as landscape)', () => {
    expect(shouldLeadWithHero([square])).toBe(true);
  });

  it('does not hero a single portrait photo', () => {
    expect(shouldLeadWithHero([portrait])).toBe(false);
  });

  it('does not hero a 2-photo post (would leave a lone orphan)', () => {
    expect(shouldLeadWithHero([landscape, landscape])).toBe(false);
  });

  it('heroes a 3-photo post led by a landscape photo', () => {
    expect(shouldLeadWithHero([landscape, portrait, portrait])).toBe(true);
  });

  it('heroes a 4+ photo post led by a landscape photo', () => {
    expect(shouldLeadWithHero([landscape, square, portrait, landscape])).toBe(true);
  });

  it('does not hero when the first photo is a portrait, regardless of count', () => {
    expect(shouldLeadWithHero([portrait, landscape, landscape])).toBe(false);
  });
});
