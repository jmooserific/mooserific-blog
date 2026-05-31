---
applyTo: '**'
---
# Design Backlog — Known Tensions

A running list of places where the **current design** and the **stated intent** in [`design.md`](./design.md) pull against each other. These aren't bugs or doc gaps — the implementation matches the docs. They're design *choices* worth revisiting as the site matures.

Intent, in one line: _a calm, photo-first digital family album, optimized for photo viewing and longevity._ Each item below is scored against that.

Work through them in roughly this order — the first three are structural; the last two are smaller.

---

## 1. The post card leads with metadata, not photos

- [ ] **Tension.** Card reading order is date hero (~140px) → caption → author → *then* the photo grid ([`design-system.md`](./design-system.md) HTML structure). On a blog where "most posts need nothing but photos," the photos arrive third. A caption-less post opens on a big number and "by …" before any image.
- **Why it matters.** Intent is photo-*first*; a digital album shows the picture, with the date as a quiet caption — not a 140px overture you scroll past on every post.
- **Not the problem.** The ghost numeral itself — at ~4% opacity it's loud in size but quiet in value, a fair reading of "understated chrome." The cost is **space and sequence**, not ink.
- **Direction to explore.** Let photos lead; overlay the date on/beside the first image instead of in a dedicated band above it. Keep the distinctive numeral treatment, drop the curtain-raiser.
- **Direction chosen (2026-05).** The timeline work commits to this: photos lead with full-bleed heroes and the date becomes a quiet divider rather than a banner, while the new timeline carries the live "when am I" wayfinding. Lands in the **photo-first feed** workstream — see [`design.md`](./design.md) *Timeline navigation* and the prototype at [`../prototypes/timeline.html`](../prototypes/timeline.html).

## 2. The book-reading column constrains the photography

- [ ] **Tension.** `max-w-4xl` (~896px) single column, 3-up rows → each photo ~280px (postcard size). That width is tuned for reading a text column; the dominant content is photographs, often text-free.
- **Why it matters.** Intent says "photo viewing" and "let the photos carry the color," but the layout caps every photo at reading-column scale in uniform rows. Calm — but photography doesn't "breathe."
- **Self-referential irony.** [`design.md`](./design.md) (Photo Books) says a good book is *not* uniform reflowed rows — yet the web gallery *is* uniform rows, making the web the less photo-expressive of the two surfaces.
- **Direction to explore.** Let the gallery break the text column (wider than `max-w-4xl`), and/or vary tile scale — an occasional full-bleed or hero image so not every photo is the same size.
- **Direction chosen (2026-05).** The same prototype commits to this: the gallery breaks the reading column with full-bleed heroes and varied tile scale. Part of the **photo-first feed** workstream (see item 1).

## 3. No permalinks vs. "longevity / archive"

- [ ] **Tension.** Pagination + date filter replaces per-post permalinks ([`design.md`](./design.md) Pagination). You can't durably bookmark, link, or share a single post — only navigate to a date. The minute-precision `date_filter` is a de-facto permalink but fragile (leans on timestamp uniqueness) and undiscoverable (no UI hands you a stable link).
- **Why it matters.** This is the item most at odds with the stated goal. For a decade-long archive "meant to outlast the website itself," stable addressable URLs are the single most important durability feature. Browsing (discovery) and permalinks (permanence) solve different problems.
- **Direction to explore.** Give each post a stable canonical URL alongside the paginated home; keep pagination for browsing.
- **Priority raised (2026-05).** The timeline makes a scrubbable *position* in the archive a first-class thing, which makes addressable URLs **more** important, not less. The timeline is being built to read and write a canonical URL once one exists — so this is now the gating dependency for sharing a moment in time, and the natural seam where permalinks plug in.

## 4. Umber signals both static text and interactive chrome

- [ ] **Tension.** Umber is used for static meta (date, author, footer) *and* all interactive ghost chrome (buttons, filter, pagination). No color cue distinguishes "umber text you read" from "umber control you click." Caption links sidestep this by staying blue; the chrome doesn't.
- **Why it matters.** Affordance rests entirely on hover wash + cursor, which don't exist on touch.
- **Direction to explore.** Document/strengthen a non-color interactivity signal (icon shape, consistent control padding, underline-on-interactive), or reserve a state for "this is clickable."

## 5. Sacramento is the one element likely to date

- [ ] **Tension.** Since longevity is an explicit goal: the script title face reads of-an-era in a way the umber/neutral/flat-card system doesn't.
- **Why it matters.** Low urgency — it's charming now. Just the element most likely to feel dated in ten years, in a design that otherwise ages well.
- **Direction to explore.** Revisit only if/when the identity is refreshed; not worth a change in isolation.

---

## What already meets the intent (don't regress these)

- **Calm, clutter-free canvas** — flat shadowless cards, generous radius, single accent, ghost chrome. The most successful axis.
- **Low-friction publishing** — batch drag-drop, live progress, advanced-collapsed, date defaults to "now," editor clears after post.
- **A real point of view** — the single-typeface weight-contrast date treatment is distinctive without being trendy-loud. Keep it (see item 1 — it's about *placement*, not removal).
