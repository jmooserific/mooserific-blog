// Per-post permalink slug helpers.
//
// The default slug for a post is derived from its date as `YYYY-MM-DD-HHMM` in
// UTC — matching how PostCard renders dates (getUTC*) so the slug always lines up
// with the date shown on the post. Authors can override this with a custom slug.

// Slug charset: lowercase letters, digits, and single hyphens as separators.
// No leading/trailing hyphens and no doubled hyphens, so slugs stay clean in URLs.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_SLUG_LENGTH = 120;

/**
 * Derive the default slug for a post from its date.
 * @param iso an ISO date string (e.g. "2026-05-31T14:30:00.000Z")
 * @returns a slug like "2026-05-31-1430"
 * @throws if the date cannot be parsed
 */
export function slugFromDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Cannot derive slug from invalid date: ${iso}`);
  }
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const min = d.getUTCMinutes().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}${min}`;
}

/** True when `slug` is well-formed and usable as a URL path segment. */
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}

/**
 * Given a desired base slug and the set of slugs already taken, return the first
 * free slug — either `base` itself or `base-2`, `base-3`, … This is how same-minute
 * collisions in the date-derived default get disambiguated.
 */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const set = taken instanceof Set ? taken : new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
