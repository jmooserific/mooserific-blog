# Mooserific — Design Guidelines

This document extends the existing design spec (`.claude/design.md`) with targeted visual enhancements. The site's existing palette, layout, and typography are preserved. These guidelines cover four specific changes: the post date treatment, brown accent colors for metadata and buttons, and updated border radii.

---

## Date treatment

### Ghost numeral backdrop

Each post card features an oversized day numeral rendered at 220px in Inter Black (900). This numeral is positioned to bleed off the **top and right edges** of the card, clipped by the card's `overflow: hidden` and `border-radius`. The clipping makes the numeral feel like it extends beyond the card's boundaries.

The month name and year are superimposed in the top-right corner of the card, right-aligned, sitting on top of the ghost numeral. The month uses Inter 700 at 14px with wide letter-spacing; the year uses Inter 300 at 13px. The extreme weight contrast between month (Bold), year (Light), and ghost numeral (Black) creates hierarchy through a single typeface.

```
┌──────────────────────────────────────────────┐
│                                    APRIL     │ ← Inter 700, 14px, Umber
│                                    2026      │ ← Inter 300, 13px, lighter brown
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

The ghost numeral must be a **direct child of the post card**, not nested inside a date-hero div. This ensures it positions relative to the card's edges for proper clipping:

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
  border-radius: 20px;   /* see Border radius section */
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
  color: #A87941;                         /* lighter brown */
  margin-top: 3px;
}
```

In dark mode, the ghost numeral color changes to `rgba(255, 255, 255, 0.035)`.

### Responsive

On viewports narrower than ~520px: the ghost numeral scales to 150px and repositions (`right: -8px; top: -32px`); the date hero height reduces to 100px; the date overlay moves to `right: 16px; top: 16px`.

### Visual variation

Single-digit days (1–9) and double-digit days (10–31) create naturally different compositions. A "5" leaves open air on the left while a "31" fills the corner more aggressively. This is a feature — it gives each card a unique visual fingerprint.

---

## Umber accent color

Three elements shift from the existing `text-gray-500` to Umber (`#845A2C`): post author/meta text, the month and year in the date overlay, and the footer.

| Element              | Current color           | New color                |
|----------------------|-------------------------|--------------------------|
| Post author ("by")   | `text-gray-500` #6b7280 | Umber `#845A2C`          |
| Date month label     | (new element)           | Umber `#845A2C`          |
| Date year            | (new element)           | `#A87941` (lighter brown)|
| Footer text + links  | `text-gray-400` #9ca3af | Umber `#845A2C`          |

Umber provides 6.0:1 contrast on white — WCAG AA compliant at any text size. The lighter brown for the year (`#A87941`) provides 3.8:1, which passes AA Large (the year text is always contextually paired with the month and ghost numeral, never standalone).

In dark mode, Umber maps to `#C09F6B` and the lighter brown to `#E0CDAA`.

### Why brown?

The moose watercolor used as the site's mascot is a warm brown palette. Using Umber for metadata creates a subtle visual connection between the site's identity and its chrome without overhauling the entire color scheme.

---

## Buttons

Every button on the site uses the same quiet ghost treatment: no fill, no visible border, Umber foreground, Umber-wash hover. There is intentionally no "primary" variant — keeping chrome uniformly subtle ensures the photo grid stays the visual focal point. Include a transparent 1px border so the hover wash doesn't shift surrounding layout.

Applies to: Create Post, Sign In, filter icon, pagination — and any future button additions.

```css
background: transparent;
border: 1px solid transparent;
color: #845A2C;                  /* Umber */
border-radius: 10px;
padding: 8px (icon) or 8px 20px (text);
font-size: 14px;
font-weight: 500;
```

Hover adds a `rgba(132, 90, 44, 0.06)` wash. Focus ring uses Umber at 2px with a 2px offset. In dark mode, the foreground becomes `#C09F6B`.

Square icon variants (Create Post, Sign In, filter trigger) keep the same styling and use `padding: 8px` with a 20px icon — no explicit width/height.

### Menus & popovers

Surfaces that open from a ghost button — dropdown menus, date filter popovers, etc. — carry the same quiet language: white panel, Umber-tinted hairline border, 10px panel radius, and 1px internal padding so item hover washes stay inset from the panel edge. Items use an 8px radius and the same Umber/6 hover wash as buttons.

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

Destructive items (Delete, etc.) are the single allowed accent departure: muted red foreground (`text-red-700/80`) with a `rgba(127, 29, 29, 0.06)` hover wash (`red-900/6`) that mirrors the Umber/6 structure. Avoid stronger reds — the `confirm()` dialog carries the safety weight, the menu item only needs to read as "different kind of action."

---

## Border radius

Two radius values increase from the current design:

| Element        | Current          | New              |
|----------------|------------------|------------------|
| Post cards     | `rounded-2xl` 16px | 20px           |
| Gallery images | `rounded-md` 6px  | 12px (`rounded-xl`) |

The larger card radius provides cleaner clipping edges for the ghost numeral. The larger image radius matches the card's interior visual language.

---

## What stays the same

Everything not mentioned above remains unchanged from the existing `design.md`:

- Page background: `bg-gray-50` (`#f9fafb`)
- Card background: white with `shadow-sm`
- Primary text: `text-gray-900` (`#111827`)
- Body text muted: `text-gray-500` (`#6b7280`) — except for author/meta (now Umber)
- Blue accent for links: `text-blue-600` (`#2563eb`)
- Site title: existing font and styling (Inter)
- Photo gallery layout: `react-photo-album` with rows/masonry
- Lightbox: `yet-another-react-lightbox`
- Date filter: existing filter icon + popover pattern
- Container width: `max-w-3xl`
- All API routes, auth, admin flow
- No new font dependencies — Inter handles everything

---

## Implementation checklist

1. Add ghost numeral element as direct child of each post card
2. Add date hero spacer div (~140px) with month/year overlay
3. Ensure Inter is loaded with weights 300, 400, 500, 700, 900
4. Update post card border-radius to 20px
5. Update gallery image border-radius to 12px
6. Change author/meta text color from `text-gray-500` to Umber `#845A2C`
7. Change footer text color to Umber `#845A2C`
8. Style all buttons (Create Post, Sign In, filter icon, pagination) with the shared ghost treatment: transparent bg + transparent border, Umber fg, 10px radius, 6% Umber hover wash
9. Add dark mode mappings for Umber → `#C09F6B` and ghost numeral → `rgba(255,255,255,0.035)`
