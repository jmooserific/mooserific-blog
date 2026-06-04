/**
 * Decides whether a post should lead with a single wide "hero" photo that
 * breaks the reading column, instead of the uniform justified rows. See the
 * design backlog item "The book-reading column constrains the photography".
 *
 * Rules (kept deliberately simple):
 *  - There must be a first photo. Video-only posts have none, so they never
 *    hero. (Once videos carry poster images we can revisit leading with one.)
 *  - The first photo must be landscape or square (`width >= height`). A tall
 *    portrait makes a poor wide hero — it either crops faces or runs off-screen.
 *  - The photo count is 1, or 3+. A lone photo *is* the hero; 3+ leaves a clean
 *    row beneath it. A 2-photo post stays a balanced pair — pulling a hero out
 *    would leave a single orphan.
 */
export function shouldLeadWithHero(
  photos: ReadonlyArray<{ width: number; height: number }>,
): boolean {
  const first = photos[0];
  if (!first) return false;
  if (first.width < first.height) return false;
  return photos.length === 1 || photos.length >= 3;
}
