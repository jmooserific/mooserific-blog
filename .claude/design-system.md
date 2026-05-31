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
| Accent             | `#845A2C` | `text-accent`         | Author/meta, month label, footer, chrome |
| Accent (hover)     | `#6d4a24` | `text-accent-hover`   | Primary-button hover                     |
| Accent (muted)     | `#A87941` | `text-accent-muted`   | Year text in the date overlay            |
| Caption link       | `#2563eb` | blue-600              | Inline Markdown links inside captions    |

**Contrast:** Umber on white is 6.0:1 (WCAG AA at any size). The muted brown used for the year is 3.8:1 — it passes AA Large only, which is acceptable because the year is always contextually paired with the month and ghost numeral, never standalone. Do **not** darken the year to "fix" contrast; the pairing is intentional.

### Why umber?

The moose watercolor used as the site's mascot is a warm brown palette. Umber for metadata and chrome creates a subtle tie between the site's identity and its UI without overhauling the neutral base.

---

## Typography

- **Body / everything:** `Inter`, loaded with weights **300, 400, 500, 700, 900**. The weight range is load-bearing — the date treatment leans on the contrast between 300, 700, and 900.
- **Site title:** `Sacramento` (script) for a personal, handwritten touch.
- No other font dependencies.

| Use                  | Font / weight     | Size  | Other                          |
|----------------------|-------------------|-------|--------------------------------|
| Body / caption       | Inter 400         | base  | `prose prose-base`             |
| Author ("by …")      | Inter 400         | 13px  | `text-accent`                  |
| Date month label     | Inter 700         | 14px  | uppercase, `0.08em` tracking   |
| Date year            | Inter 300         | 13px  | `text-accent-muted`            |
| Ghost day numeral    | Inter 900         | 220px | see Date treatment             |

---

## Layout & spacing

| Element         | Value                                            |
|-----------------|--------------------------------------------------|
| Container width | `max-w-4xl` (~900px), `mx-auto px-4 sm:px-6`     |
| Card wrapper    | `bg-white rounded-[20px] mb-8` — flat, no shadow |
| Card radius     | **20px** (`rounded-[20px]`)                      |
| Gallery image   | **12px** (`rounded-xl`)                          |
| Footer          | `text-center text-sm text-accent py-6`           |

The 20px card radius gives clean clipping edges for the ghost numeral; the 12px image radius echoes the card's interior language.

---

## Date treatment

### Ghost numeral backdrop

Each post card features an oversized day numeral rendered at 220px in Inter Black (900), positioned to bleed off the **top and right edges** of the card, clipped by the card's `overflow: hidden` and `border-radius`. The clipping makes the numeral feel like it extends beyond the card.

The month name and year sit superimposed in the top-right corner, right-aligned, on top of the ghost numeral. The extreme weight contrast — month (Bold), year (Light), ghost numeral (Black) — creates hierarchy through a single typeface.

```text
┌──────────────────────────────────────────────┐
│                                    APRIL     │ ← Inter 700, 14px, Umber
│                                    2026      │ ← Inter 300, 13px, muted brown
│                                        ┌─────┤
│                                        │  5  │ ← Inter 900, 220px, ~4% opacity
│                                        │     │    clipped by card top + right edges
│                                        └─────┤
│                                              │
│ Post body text...                            │
│ by vemoose                                   │ ← Inter 400, 13px, Umber
│                                              │
│ ┌────────────────┬──────────┐                │
│ │   photo        │  photo   │                │
│ └────────────────┴──────────┘                │
└──────────────────────────────────────────────┘
```

### HTML structure

The ghost numeral must be a **direct child of the post card**, not nested inside a date-hero div, so it positions relative to the card's edges for proper clipping:

```html
<article class="post-card">
  <div class="date-giant">5</div>           <!-- direct child of card -->
  <div class="post-date-hero">              <!-- spacer, ~140px height -->
    <div class="date-overlay">              <!-- absolute, top-right -->
      <div class="month">April</div>
      <div class="year">2026</div>
    </div>
  </div>
  <div class="post-body-area">
    <p class="caption">...</p>
    <p class="author">by <strong>vemoose</strong></p>
  </div>
  <div class="photo-grid">...</div>
</article>
```

### CSS

```css
.post-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
}

.date-giant {
  font-family: inherit;                   /* Inter, from body */
  font-weight: 900;                       /* Inter Black */
  font-size: 220px;
  line-height: 0.78;
  letter-spacing: -0.05em;
  color: rgba(0, 0, 0, 0.04);            /* ~4% black in light mode */
  position: absolute;
  right: -12px;
  top: -48px;
  user-select: none;
  pointer-events: none;
  z-index: 1;
}

.post-date-hero {
  position: relative;
  height: 140px;
}

.date-overlay {
  position: absolute;
  right: 28px;
  top: 28px;
  text-align: right;
  z-index: 2;
}

.date-overlay .month {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #845A2C;                         /* Umber */
}

.date-overlay .year {
  font-weight: 300;
  font-size: 13px;
  color: #A87941;                         /* muted brown */
  margin-top: 3px;
}
```

### Responsive

On viewports narrower than ~520px: the ghost numeral scales to 150px and repositions (`right: -8px; top: -32px`); the date hero height reduces to 100px; the date overlay moves to `right: 16px; top: 16px`.

### Visual variation

Single-digit days (1–9) and double-digit days (10–31) create naturally different compositions — a "5" leaves open air on the left while a "31" fills the corner more aggressively. This is a feature: it gives each card a unique visual fingerprint.

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

## Timeline navigation (target — pre-implementation)

> This section is the **build brief** for the timeline described in [`design.md`](./design.md). The _behavior_ below is settled; the exact numbers (radii, blur, tints, breakpoints, durations) are **provisional** and live in the working prototype at [`../prototypes/timeline.html`](../prototypes/timeline.html). Treat that prototype as the reference implementation, and finalize the values here as "as-built" once the component ships in React.

### Surfaces & states

- **Two layouts, chosen by viewport aspect:** a horizontal bar on the bottom edge when the viewport is wider than tall, a vertical rail on the right edge when taller than wide. Newest sits at the **right** (horizontal) / **top** (vertical) — consistent under a clockwise quarter-turn, so the playhead tracks scroll the same way in both.
- **Floating "liquid glass" panel:** translucent, blurred, rounded on all four corners, with a soft drop shadow. (Floating surfaces get a shadow; cards do not — consistent with the menu/popover rule above.) Radius sits between the image (12px) and card (20px) so it reads as its own floating control. It floats _over_ the photos and reserves no column; the horizontal bar reserves a little foot-room only so the last post clears it.
- **Width (horizontal):** centered and capped so it is always narrower than the photo column at every responsive width — never edge-aligned with the photos.
- **Expanded ↔ collapsed:** a ghost toggle minimizes the timeline to a small **read-only** pill showing just the current date (still live as you scroll). The toggle lives at the bottom-right of the timeline in both orientations, and the collapsed pill sits bottom-right with its expand control landing where the toggle was — so the control does not slip out from under the cursor when toggled. Default is **expanded** (collapsing-by-default would hurt discoverability).

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
- **URL / permalinks:** build so the playhead can read and write a canonical URL; ship on scroll-position first, wire URL sync when permalinks land.

---

## Dark mode (planned)

Dark mode isn't implemented yet (it's a future item in `design.md`). When it lands, use these mappings:

| Light                            | Dark                      |
|----------------------------------|---------------------------|
| Umber `#845A2C`                  | `#C09F6B`                 |
| Muted brown `#A87941`            | `#E0CDAA`                 |
| Ghost numeral `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.035)` |

Ghost-button and primary-button foregrounds follow the Umber → `#C09F6B` shift.
