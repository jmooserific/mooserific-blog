---
applyTo: '**'
---
# Mooserific — Design System

This is the **implementation reference** for the site's visual design. It records the concrete values — colors, typography, spacing, radii, and component CSS — that realize the intent described in [`design.md`](./design.md). Where `design.md` says _"a warm umber accent tied to the moose mascot"_, this document says _which hex, which token, which hover wash_.

Keep the two in sync: `design.md` owns the _why_, this file owns the _how_. If a value here changes, make sure it still serves the intent over there.

---

## Color tokens

The accent is a warm **umber**, defined as custom theme tokens in `globals.css` rather than stock Tailwind colors:

```css
@theme {
  --color-accent: #845A2C;        /* Umber */
  --color-accent-hover: #6d4a24;  /* darker umber, for hover */
  --color-accent-muted: #A87941;  /* lighter brown */
}
```

| Purpose            | Color     | Token / class         | Notes                                    |
|--------------------|-----------|-----------------------|------------------------------------------|
| Page background    | `#f9fafb` | `bg-gray-50`          |                                          |
| Card surface       | `#ffffff` | `bg-white`            | Flat — **no shadow** on cards            |
| Primary text       | `#111827` | `text-gray-900`       |                                          |
| Secondary text     | `#6b7280` | `text-gray-500`       | Body muted, _not_ author/meta            |
| Accent             | `#845A2C` | `text-accent`         | Author/meta, card footer date, chrome    |
| Accent (hover)     | `#6d4a24` | `text-accent-hover`   | Primary-button hover                     |
| Accent (muted)     | `#A87941` | `text-accent-muted`   | Timeline month labels                    |
| Caption link       | `#2563eb` | blue-600              | Inline Markdown links inside captions    |

**Contrast:** Umber on white is 6.0:1 (WCAG AA at any size). The muted brown is 3.8:1 — it passes AA Large only, so it's reserved for the timeline's month labels, where the text is large/short and contextually anchored to the track. Do **not** use it for body-size standalone meta.

### Why umber?

The moose watercolor used as the site's mascot is a warm brown palette. Umber for metadata and chrome creates a subtle tie between the site's identity and its UI without overhauling the neutral base.

---

## Typography

- **Body / everything:** `Inter`, loaded with weights **300, 400, 500, 700, 900**.
- **Site title:** `Sacramento` (script) for a personal, handwritten touch.
- No other font dependencies.

| Use                  | Font / weight     | Size  | Other                          |
|----------------------|-------------------|-------|--------------------------------|
| Caption              | Inter 400         | 14px  | `prose prose-sm max-w-none`    |
| Card byline meta     | Inter 400         | 13px  | `text-accent`; date + author   |

---

## Layout & spacing

| Element         | Value                                            |
|-----------------|--------------------------------------------------|
| Container width | `max-w-4xl` (~900px), `mx-auto px-4 sm:px-6`     |
| Card wrapper    | `bg-white rounded-[20px] mb-8` — flat, no shadow |
| Card radius     | **20px** (`rounded-[20px]`)                      |
| Gallery image   | **12px** (`rounded-xl`)                          |
| Footer          | `text-center text-sm text-accent py-6`           |

The 20px card radius and the 12px image radius echo each other — the interior gallery language nested inside the card.

---

## Post card layout

The card is **photos-forward**: a quiet byline and the caption lead in as a compact header, then the photo grid carries the visual weight as the dominant mass, and a footer row of left-aligned controls closes the card. The header is kept small (one 13px meta line + prose caption) so it reads as a lead-in, not a banner — the **Timeline navigation** surface still carries the live "when am I" wayfinding, so the per-post date stays understated. A caption-less post shows just the byline above its first image.

### Structure

```text
┌──────────────────────────────────────────────┐
│ May 14, 2026 · by vemoose                    │ ← byline: Inter 400, 13px, text-accent
│ Caption text (optional — lead-in)            │ ← prose prose-sm, 14px
│                                              │
│ ┌────────────────┬──────────┐                │
│ │   photo        │  photo   │                │ ← gallery carries the visual weight
│ └────────────────┴──────────┘                │
│                                              │
│ ✎  🗑  ↗                                     │ ← footer: controls left-aligned
└──────────────────────────────────────────────┘
```

```html
<article class="post-card">          <!-- rounded-[20px], overflow-hidden, p-4 -->
  <header>                            <!-- mb-4, flex flex-col gap-2 -->
    <p class="meta">                  <!-- Inter 400, 13px, text-accent -->
      <time datetime="…">May 14, 2026</time> · by <strong>vemoose</strong>
    </p>
    <div class="prose">…caption…</div> <!-- rendered only when non-empty -->
  </header>
  <div class="gallery">…photos / videos…</div>
  <footer>                            <!-- flex items-center gap-1; left-aligned -->
    <button>✎ edit</button>           <!-- admin only -->
    <button>🗑 delete</button>        <!-- admin only, reserved red, confirm-gated -->
    <a>↗ permalink</a>                <!-- everyone -->
  </footer>
</article>
```

### Hero (first photo breaks the reading column)

When a post is led by a landscape (or square) first photo, that photo renders as a wide **hero** instead of joining the justified rows — letting the photography breathe past the reading column. The card itself widens from `max-w-4xl` to `max-w-6xl` (~1152px) for hero posts; normal posts stay in the reading column, so the feed track is sized for the widest card and each card centers at its own width.

- **When a hero applies.** First photo is landscape/square (`width >= height`) **and** the post has 1 or 3+ photos. A 2-photo post stays a balanced pair; a portrait-led or video-only post keeps the rows. See [`heroLayout.ts`](../src/utils/heroLayout.ts).
- **Sizing.** The hero respects the photo's real aspect ratio (no destructive crop — faces matter) with a `max-h-[85vh]` safety cap; `object-cover` only engages on the rare clamp. It's the LCP image on above-fold posts (`priority`/`eager`), so the rows beneath it never get eager loading.
- **Remaining photos.** Photos after the first render in the usual rows beneath the hero, at the wider container width. The hero stays index 0 in the lightbox.
- **Videos.** No poster images exist yet, so a video-led post never heroes — tracked as a TODO in [`PostCard.tsx`](../src/components/PostCard.tsx).

### Caption

Captions render the post's Markdown through `prose prose-sm` (`@tailwindcss/typography`, 14px) — bigger than the byline meta, smaller than 16px body. `max-w-none` removes the plugin's default `65ch` measure so the caption fills the card width instead of wrapping early. The caption sits in the header as the lead-in beneath the byline (`flex flex-col gap-2` handles the byline↔caption spacing; the plugin zeroes the prose first-child top margin). The plugin owns caption typography; the only divergence from its defaults is the **blue caption link** (`#2563eb`), set via `--tw-prose-links` in [`globals.css`](../src/globals.css) (the plugin already underlines links).

### Byline meta & controls

- **Date.** Full date, UTC-formatted (`May 14, 2026`) inside a `<time dateTime>`, Inter 400 / 13px / `text-accent`, leading the header byline. UTC keeps SSR and client render identical and matches the slug's UTC basis.
- **Author.** `by <strong>name</strong>`, same size and color, separated from the date by a ` · ` middot (`aria-hidden`). Either field may be absent; the separator renders only when both date and author are present.
- **Controls** sit at the footer's **left** as ghost icon buttons (`p-2`, `rounded-[10px]`, `text-accent`, `hover:bg-accent/6`, focus ring) — the same chrome language as everywhere else. Left-aligned so the right-edge vertical timeline rail (narrow screens) never covers them. Admins see **edit** (`PencilSquareIcon`) and **delete** (`TrashIcon`, `text-red-700/80` — the reserved destructive red, gated behind a `confirm()`); everyone sees the **permalink share** (`ShareIcon`). See **Permalinks → Share affordance** below.

---

## Buttons

Two treatments: a default **ghost** treatment that covers all chrome, and a single **primary** treatment reserved for the main submit button on traditional forms. Keeping primary scoped this narrowly keeps the photo grid the visual focal point on reader-facing surfaces.

### Ghost (default)

No fill, no visible border, Umber foreground, Umber-wash hover. Include a transparent 1px border so the hover wash doesn't shift surrounding layout.

Applies to: Create Post, Sign In (header icon), filter icon, pagination, Back to site, Sign out — and any future button that isn't a form submit.

```css
background: transparent;
border: 1px solid transparent;
color: #845A2C;                  /* Umber */
border-radius: 10px;
padding: 8px (icon) or 8px 20px (text);
font-size: 14px;
font-weight: 500;
```

Hover adds a `rgba(132, 90, 44, 0.06)` wash. Focus ring uses Umber at 2px with a 2px offset. Square icon variants (Create Post, Sign In, filter trigger) keep the same styling with `padding: 8px` and a 20px icon — no explicit width/height.

### Primary

Used **only** for the main submit button on a traditional form — the single place filled chrome appears on the site. On form-centric pages the photo grid isn't the focal point, so a real primary helps users complete the task.

Applies to: the admin editor's Post / Update post button, and the login page's Sign in button. Do not use for navigation, toggles, icon actions, or anything on a photo-viewing surface — those stay ghost.

```css
background: #845A2C;             /* Umber */
color: #fff;
border-radius: 10px;
padding: 8px 16px;
font-size: 14px;
font-weight: 500;
```

Hover darkens to `#6d4a24`. Focus ring uses Umber at 2px with a 2px offset. Disabled sets `opacity: 0.5` and suppresses the hover darken. One primary per form — any second submit-shaped action stays ghost.

### Menus & popovers

Surfaces that open from a ghost button — dropdown menus, date filter popovers — carry the same quiet language: white panel, Umber-tinted hairline border, 10px panel radius, 1px internal padding so item hover washes stay inset. Items use an 8px radius and the same Umber/6 hover wash.

```css
/* Panel */
background: #fff;
border: 1px solid rgba(132, 90, 44, 0.15);  /* Umber/15 */
border-radius: 10px;
padding: 4px;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);  /* shadow-md */

/* Item */
color: #845A2C;                              /* Umber */
border-radius: 8px;
padding: 8px 12px;
/* hover */ background: rgba(132, 90, 44, 0.06);
```

> Cards carry no shadow, but **menu/popover panels do** (`shadow-md`) — the lift signals they float above the page.

Destructive items (Delete, etc.) are the single allowed accent departure: muted red foreground (`text-red-700/80`) with a `rgba(127, 29, 29, 0.06)` hover wash (`red-900/6`) that mirrors the Umber/6 structure. Avoid stronger reds — the `confirm()` dialog carries the safety weight; the menu item only needs to read as "different kind of action."

---

## Timeline navigation (as-built)

> This section describes the shipped timeline (`src/components/Timeline.tsx`), driven by the feed in `src/components/FeedClient.tsx`. It grew out of the prototype at [`../prototypes/timeline.html`](../prototypes/timeline.html); where the two diverge, the React component is authoritative. The _behavior_ below is settled; exact numbers (radii, blur, tints, durations) live in the component.

### Surfaces & states

- **Two layouts, chosen by viewport width:** a horizontal bar on the bottom edge at the `sm` breakpoint and up (≥ 640px, `PORTRAIT_BELOW_PX`), a vertical rail on the right edge only below it. The threshold is a width, not an aspect ratio: above `sm` the header's sign-in / create-post button is right-aligned (`sm:justify-end`), and a right-edge rail would cover it; below `sm` the button re-centers, freeing the right edge. Newest sits at the **right** (horizontal) / **top** (vertical) — consistent under a clockwise quarter-turn, so the playhead tracks scroll the same way in both.
- **Floating "liquid glass" panel:** translucent, blurred, rounded on all four corners, with a soft drop shadow. (Floating surfaces get a shadow; cards do not — consistent with the menu/popover rule above.) Radius sits between the image (12px) and card (20px) so it reads as its own floating control. It floats _over_ the photos and reserves no column; the horizontal bar reserves a little foot-room only so the last post clears it.
- **Width (horizontal):** centered and capped so it is always narrower than the photo column at every responsive width — never edge-aligned with the photos.
- **Expanded ↔ collapsed:** a ghost toggle (the **minimize** glyph, `ArrowsPointingInIcon`) shrinks the timeline to a small **read-only** pill that still tracks the current date as you scroll. The toggle lives at the bottom-right of the timeline in both orientations, and the collapsed pill sits bottom-right with its expand control landing where the toggle was — so the control does not slip out from under the cursor when toggled. The pill leads with a **calendar icon** (`CalendarDaysIcon`) and a "Jump through time" tooltip so it reads as a time-jump control, not just a date label, and closes with the **maximize** glyph (`ArrowsPointingOutIcon`). The minimize/maximize pair replaces the older up/down chevrons — a clearer, more discoverable signal, which matters because the timeline now starts collapsed on narrow screens (see below).
- **Default state by layout:** **expanded** in the horizontal (landscape) layout; **collapsed** on first load in the vertical (portrait) layout, so the right-edge rail doesn't cover the photos when a phone visitor opens the page. This is applied once, on the first viewport measurement — after that the visitor owns the state and a resize never re-collapses it. The discoverability cost of starting collapsed is paid back by the calendar-iconed pill and the explicit minimize/maximize glyphs above.

### Markers (reusing the button language)

- **Playhead** ("you are here"): the **ghost** treatment — umber, a small arrow into the feed, a date label. Tracks the in-view post as you scroll.
- **Cursor** ("Enter commits this jump"): the **primary/filled** treatment — filled umber, white text — the same signal a form's submit button uses. It sits in front of the playhead, which recedes (dims, drops its label) while you steer, so only one date label is read at a time.
- The cursor is a transient keyboard tool: it rides _with_ the playhead and stays hidden, becomes visible only once moved by keyboard, and rejoins the playhead (hides) on commit or blur. No second accent hue is introduced — the distinction is ghost vs. primary, staying inside the single-umber system. If the fill/dim contrast ever proves too subtle, the only safe alternative is a **neutral** (e.g. slate), never a colored hue — red is reserved for destructive actions.

### Density read-out

- One mark per month across the whole span; fixed thickness along the time axis, length scaled by that month's post count; empty months render as a faint baseline; the active month brightens. It is a texture to aim at, not a row of click targets.

### Interaction contract

- **Pointer:** hover shows a date chip offset _off_ the pointer (above it in horizontal, left of it in vertical) so it never covers the spot being aimed at; click/drag scrolls the feed to the nearest post at that time.
- **Keyboard (the accessible path that replaces the date picker):** the timeline is a `role="slider"` with `aria-valuemin/max/now`, `aria-valuetext` (the month), and `aria-orientation` per layout. Right/Up = forward in time, Left/Down = back (true in both orientations); Shift = jump by year; Home/End = ends of the archive; Enter/Space = scroll to the cursor. The focus ring sits on the floating panel (not the inner track) so it is never crammed against the first/last year.
- **What drives the playhead:** scroll position → the in-view post → the marker. Jumps map a point in time to the **nearest post**. (Nearest-post is right for a sparse archive; at hundreds of posts, revisit whether jumps should scroll proportionally and snap.)

### Seams (not the timeline's own job)

- **Photo-first feed** (full-bleed heroes, date-as-divider): a separate workstream — the timeline drops onto the current feed and does not require it.
- **URL / permalinks:** build so the playhead can read and write a canonical URL; ship on scroll-position first, wire URL sync when permalinks land. Per-post permalinks have landed (see _Permalinks_ below); the timeline's _position_ URL is a separate concern from a post's canonical address.

---

## Permalinks

Each post has a canonical URL: **`/p/<slug>`** (route `src/app/p/[slug]/page.tsx`, server-rendered).

### Slug format

- **Default:** derived from the post's date as **`YYYY-MM-DD-HHMM`** in **UTC** (e.g. `2026-05-31-1430`). UTC matches the post card's date rendering, so the slug always agrees with the date shown.
- **Collisions:** same-minute posts auto-suffix — `…-1430`, then `…-1430-2`, `…-1430-3`, … (`nextAvailableSlug` in `src/utils/slug.ts`).
- **Custom slugs:** charset `^[a-z0-9]+(?:-[a-z0-9]+)*$` — lowercase letters, digits, single hyphens as separators, no leading/trailing/doubled hyphens; max 120 chars (`isValidSlug`). Validated at the API boundary with Zod; a duplicate custom slug is rejected with **409**, a malformed one with **400**.
- **Storage:** `posts.slug TEXT` with a `UNIQUE` index (migration `0002_post_slug.sql`). Backfill existing rows with `npm run backfill:slugs` (supports `--dry-run`).

### Lifecycle

- **Frozen on publish.** Editing a post — including changing its date — never auto-changes the slug. While _drafting a new_ post the slug tracks the date live until the author types their own (then it's pinned).
- **Editable, with a warning.** On the edit form the slug stays editable; changing it shows a warning that existing links will break (amber by default, red once actually changed).

### Form field

Lives in the **Advanced** `<details>` of the create/edit form, below the date control. Rendered as a `/p/` prefix followed by a borderless text input inside the standard bordered field shell (`border-accent/15`, focus ring `accent/30`). Helper text: charset + "Defaults to the post date."

### Share affordance

The `PostCard` footer carries a ghost **share** icon (`ShareIcon`, heroicons 24/outline) linking to `/p/<slug>` — same ghost treatment as the other footer chrome (transparent, `text-accent`, `hover:bg-accent/6`, focus ring). Visible to everyone (admins also get edit/delete to its left), it's the discoverable way to grab a post's stable link. See **Post card layout → Byline meta & controls**.

---

## Dark mode (planned)

Dark mode isn't implemented yet (it's a future item in `design.md`). When it lands, use these mappings:

| Light                            | Dark                      |
|----------------------------------|---------------------------|
| Umber `#845A2C`                  | `#C09F6B`                 |
| Muted brown `#A87941`            | `#E0CDAA`                 |

Ghost-button and primary-button foregrounds follow the Umber → `#C09F6B` shift.
