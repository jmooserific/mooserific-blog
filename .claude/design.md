---
applyTo: '**'
---
Let’s design a clean, modern, and family-friendly blog layout that focuses on **simplicity**, **photography**, and **longevity** — optimized for readability, photo viewing, and export-to-photo-book use. Responsiveness and accessibility are musts. Videos are also supported in posts, but they aren't the primary focus.

We want something that feels calm, personal, and clutter-free — like a digital family album.

> This document captures **design intent** — the what and the why. The concrete implementation — exact colors, sizes, radii, fonts, and component CSS — lives in [`design-system.md`](./design-system.md). When the two could drift, intent wins here and values win there. Known places where the current design pulls against this intent are tracked in [`design-backlog.md`](./design-backlog.md).

---

## 🧱 Layout Structure

### 🏠 Homepage (`/`)

* **Centered, single-column reading layout** at a comfortable, book-like width
* **Each post**:

  * Flat, shadow-free card-style container with generously rounded corners
  * Top-right: Month + year, small and uppercase, in the warm accent color
  * A large, very faint day-of-month numeral as a background watermark behind the header
  * Middle: Text (caption/description), followed by the author line (`by **Name**`) in the accent color
  * Bottom: Tiled/mosaic photo gallery, then any videos
  * Newer/Older navigation at the foot of the list (see _Pagination_ below)

---

### Timeline navigation

The blog spans well over a decade and will hold hundreds of posts. Navigating that archive is the job of a single, always-present **timeline** — a horizontal "time map" along the foot of the page, or a vertical rail on the long edge of taller, narrower screens. It replaces the old filter-icon-and-date-picker popover entirely.

The guiding idea: **the timeline is a map, not an index.** Its job is orientation and _browsing_ — getting you to roughly the right neighborhood in time and showing the shape of the archive — not pinpoint lookup. That distinction is what lets it scale to fifteen years without becoming unusable: it never tries to be pixel-precise about a single day. (We deliberately did _not_ make the timeline itself scroll or zoom; a map you have to scroll is no longer a map.)

What it does:

* **Shows where you are.** A marker tracks your position in the feed as you scroll, always answering "_when_ am I?". Because the timeline now carries this, the per-post date no longer needs to be a loud banner — it can recede to a quiet caption (the direction already noted for the post layout).
* **Shows the shape of the archive.** A density read-out makes busy stretches — a summer, a holiday — visibly denser than quiet ones, so the archive has texture you can aim at.
* **Lets you jump.** Click or drag to a point in time and the feed moves to the nearest post there.
* **Stays out of the photos' way.** It floats _over_ the photography as a quiet translucent surface rather than occupying a reserved strip, and it can be **minimized** to a small read-out showing just the current date — important on phones, where the photos should own the screen. It stays visible by default, because hiding it by default would hurt discoverability.

Because _browsing_ and _pinpoint lookup_ are genuinely different needs, the small amount of precise navigation the date picker used to offer is folded **into** the timeline rather than living in a separate control: the timeline is fully **keyboard-operable** (step by month, jump by year, commit to navigate). That also makes it reachable for keyboard and screen-reader users, which a drag-only timeline would not be — and accessibility is a must, not a nicety. If exact date entry is ever warranted, it belongs inside the timeline, not as a separate popover.

When a chosen point in time has no posts, say so gently rather than showing an empty feed.

> The timeline's _position_ should be reflected in the page's URL, so a moment in the archive can be linked and shared. That position URL is distinct from a post's own canonical address (see _Permalinks_ below) — the timeline only needs to read and write the position.

---

### Pagination

The homepage shows a single page of the most recent posts (currently 15 at a time) rather than loading the whole archive at once. **Newer** and **Older** links at the foot of the list move between pages, and they respect any active date filter so paging never silently drops the filter. The controls only appear when there's actually a page to move to.

Pagination and the date filter are how you _browse_ the archive. Addressing a single moment is a separate need, met by permalinks (below) — the two coexist rather than one replacing the other.

In the future, we may add additional filtering mechanisms, like tags or authors.

---

### Permalinks

Every post has its own stable, shareable address — a canonical URL that points at exactly that post. This is the archive's most important durability feature: for a collection meant to outlast the website itself, a link you can bookmark, text to a relative, or paste into an email needs to keep working for years.

Posts don't have titles or subjects (we don't want that friction when posting), so a post's default address is **derived from its date**. When two posts share the same moment, the address quietly disambiguates so each stays unique. An author who wants something more memorable can override the default when creating or editing a post.

Once a post is published its address is **frozen** — editing the post, even changing its date, leaves the link intact so anything already shared keeps working. The address _can_ still be changed by hand, but doing so is a deliberate act and the editor warns that it will break existing links.

Each post surfaces a quiet **share** control that hands you its permalink, so the stable link is always one click away rather than something you have to know to construct.

> The timeline writes a browsable _position_ into the URL; permalinks give each post its own canonical address. The exact URL shapes live in [`design-system.md`](./design-system.md).

---

## 🎨 Color & Tone

Keep it light, warm, and non-commercial — a neutral, gallery-like canvas that lets the photos carry the color.

* A soft off-white background and near-black text for easy reading.
* A single **warm umber accent** for metadata, the date, the footer, and interactive chrome. It's drawn from the warm browns in the site's moose mascot, tying the identity to the UI without competing with the photos.
* Inline links inside post captions keep the familiar link blue, so they read unmistakably as links.

Chrome is deliberately understated. Buttons and menu items share a single quiet **ghost** treatment — no fills, no visible borders, just accent text with a subtle tint on hover. The one exception is the main submit button on a form (publishing a post, signing in), which gets a filled accent treatment because on those task-focused screens the photos aren't the point. Everything else stays ghost so the photo grid remains the focal point.

> Exact hex values, tokens, and the ghost/primary button CSS live in [`design-system.md`](./design-system.md).

---

## 🖼️ Gallery Style

* A **rows-based gallery**, with each row holding up to three photos and gently rounded corners.
* Clicking any photo opens a **full-screen lightbox slideshow** of that post's images, starting from the one that was clicked. The lightbox shows a high-resolution version for crisp display on retina screens.
* If a post contains videos, they appear after the photo gallery as simple inline video players.

---

## ✏️ Font Pairing

Use a humanist, friendly typeface:

* Base: `Inter` for all body text, captions, dates, and authors
* The site title uses a casual script face (`Sacramento`) for a personal, handwritten touch
* A print-style serif for date/author remains a possible future flourish, but isn't used today

---

## 🔐 Admin & Publishing

The blog is read-only for visitors. Trusted family contributors can sign in to publish, edit, and remove posts. The whole flow is designed to be **low-friction** — adding a batch of photos should feel as quick and casual as sending a text message.

> **Accounts:** today a single shared admin account exists as a starting point, but the experience should be built so that **multiple named accounts** can be added later — each post is already attributed to an author, and the UI should treat "who is signed in" as a first-class idea rather than assuming one universal admin.

### Signing in

* The site header shows a subtle **Sign in** affordance to anyone who isn't logged in. Once signed in, that same spot becomes a **Create post** action instead — so the header quietly adapts to who's looking.
* Signing in is a single calm, centered card: just a name and password, wearing the same warm styling as the rest of the site. There's no public sign-up — this is a private family album.
* A successful sign-in keeps you logged in for the rest of your session and drops you straight into the editor. If something's wrong, you get a friendly inline message, never a scary error.
* **Sign out** is always within reach from the admin view.

### Creating a post (low-friction)

The editor is intentionally minimal — most posts need nothing but photos:

* **One caption field** (optional, with light Markdown formatting) and a **drag-and-drop area for photos and videos**. That's the entire required surface.
* Drop or pick a whole batch of media at once. Each file shows a **live progress indicator** as it uploads, so you always know where things stand.
* Media can be **reordered by dragging**, and photos naturally group ahead of videos so galleries stay tidy.
* The **original photos are always kept**, not just the web-optimized versions — important for a family archive meant to last and to export cleanly into photo books.
* Everything non-essential hides behind a collapsed **Advanced** section. The main control there is the **post date/time**, which defaults to "now" — so the common case takes zero extra clicks, while back-dating an older or scanned photo is still easy.
* A single **Post** button publishes, then the editor clears itself for the next batch.

### Editing a post

* Each post offers an unobtrusive **⋯ actions menu**, visible only to signed-in contributors. Choosing **Edit** reopens that post in the editor.
* The editor comes back pre-filled with the existing caption, media, and date so you can tweak wording, add or remove photos, reorder the gallery, or fix the date, then save your changes.

### Deleting a post

* The same **⋯ menu** offers **Delete**, shown in a muted red to signal that it's destructive.
* Deleting always asks for confirmation first ("This cannot be undone."). Once confirmed, the post disappears from the homepage in place, without a jarring full reload.

---

## 🧭 Optional Features (Nice to Have)

| Feature                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| Light/dark mode toggle     | Subtle toggle in footer                       |
| Year/month archive sidebar | Clickable list of dates in sidebar            |
| Infinite scrolling         | Replace Newer/Older paging with seamless load |
| “Print view”               | Stripped-down style with large photos         |

---

## 📚 Export, Print & Photo Books

Two related but quite different goals live here. Both matter because this is a family archive meant to outlast the website itself.

### Print view

A lightweight print stylesheet that takes **whatever is currently on screen** and makes it look good on paper or as a saved PDF — nothing more ambitious than re-styling the existing page. It should:

* Hide site chrome (header, buttons, filters, footer) and show just the posts
* Enlarge images and use print-safe typography and spacing
* Add sensible page breaks so a post isn't split awkwardly across pages

This is the easy, near-term win: it reuses the web layout and simply optimizes it for the printer. To keep it within reach, favor consistent spacing and fonts that render cleanly in PDF.

### Photo books (future, aspirational)

A much bigger idea: generating **beautifully laid-out, professional-looking photo books** from the archive — the kind of bound keepsake you'd order to remember a year of family life.

This is deliberately _not_ the web layout reflowed onto paper. A good photo book is a sequence of **designed page spreads** — varied grids, the occasional full-bleed image, real breathing room, photos sized for emphasis rather than uniform rows. Getting there means solving some genuinely hard problems we haven't settled yet:

* **Layout intelligence.** The book has to decide how many photos belong on a spread, how to arrange them, when to give one image a full page versus tiling several, and how to keep facing pages balanced. This likely needs a library of layout templates plus rules — or some system that can make judgment calls — for choosing among them.
* **Cropping judgment.** Book layouts use fixed aspect ratios that rarely match the originals, so the system has to make tasteful cropping decisions: keep faces and subjects intact, respect the focal point, and never lop off someone's head just to fill a frame.
* **Pacing and structure.** Where posts begin and end, how captions and dates translate to a printed page, and how to chapter the book (e.g. by year or event).
* **Print-grade output.** Color, bleed, resolution, and trim safety all need to be print-correct, not screen-correct.

This is a key reason we **always keep the full-resolution originals** in storage (see _Media Storage_ in `CLAUDE.md`): a great print — or a re-crop for a different frame — needs the source file, not a web-optimized variant.

How those layout and cropping decisions actually get made — fixed templates, heuristic rules, an AI-assisted layout pass, or some blend — is still an open question. The point here is to capture the _goal_ and the _hard parts_, not to commit to an approach yet.
