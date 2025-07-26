---
applyTo: '**'
---
Absolutely! Let’s design a clean, modern, and family-friendly blog layout that focuses on **simplicity**, **photography**, and **longevity** — optimized for readability, photo viewing, and export-to-photo-book use. Responsiveness and accessibility are musts.

You want something that feels calm, personal, and clutter-free — like a digital family album.

---

## 🧱 Layout Structure

### 🏠 Homepage (`/`)

* **Centered column layout**, max width around `700px–900px`
* **Each post**:

  * Subtle card-style container
  * Top: Date & author in small gray text
  * Middle: Text (caption/description)
  * Bottom: Tiled/mosaic photo gallery

---

### 📄 Individual Post Page (`/2025/07/26/14-42`)

* Same layout as homepage
* Slightly larger photos (for focused viewing)
* Optional “Back to Archive” link at top
* Optional download/export to PDF button

---

### 🎛 Styling Approach (Tailwind CSS)

Use these principles:

| Element       | Tailwind Style Suggestions                               |
| ------------- | -------------------------------------------------------- |
| Body / Root   | `bg-gray-50 text-gray-900 font-sans antialiased`         |
| Container     | `max-w-3xl mx-auto px-4 sm:px-6 py-8`                    |
| Card Wrapper  | `bg-white rounded-2xl shadow-sm p-6 mb-8`                |
| Post Meta     | `text-sm text-gray-500 mb-4`                             |
| Caption Text  | `prose prose-base mb-6` (with `@tailwindcss/typography`) |
| Image Gallery | Use `react-photo-album`, `gap={4}` + `padding-top: 2`    |
| Footer        | `text-center text-sm text-gray-400 py-6`                 |

---

## 🎨 Color Palette

Keep it light, warm, and non-commercial. Example:

| Purpose        | Color       | Tailwind Token  |
| -------------- | ----------- | --------------- |
| Background     | `#f9fafb`   | `bg-gray-50`    |
| Primary text   | `#111827`   | `text-gray-900` |
| Secondary text | `#6b7280`   | `text-gray-500` |
| Accent         | `#2563eb`   | `text-blue-600` |
| Card shadow    | Subtle only | `shadow-sm`     |

---

## 🖼️ Gallery Style

With `react-photo-album`:

* Layout: `"rows"` or `"masonry"`
* Use a slightly rounded style: `rounded-md`
* Optional hover effect: `hover:opacity-90 transition`

---

## ✏️ Font Pairing

Use a humanist, friendly typeface:

* Base: `Inter`, `Nunito`, or `system-ui`
* Optionally add `Playfair Display` or `DM Serif Text` for date/author for a print-style vibe

---

## 🧭 Optional Features (Nice to Have)

| Feature                    | Description                                |
| -------------------------- | ------------------------------------------ |
| Light/dark mode toggle     | Subtle toggle in footer                    |
| Year/month archive sidebar | Clickable list of dates in sidebar         |
| Pagination                 | 5–10 posts per page with “Older Posts” nav |
| “Print view”               | Stripped-down style with large photos      |

---

## 📚 Export Consideration

Use consistent spacing and fonts that will render well in a PDF. Later, your `print.css` or `print-view.tsx` can apply:

* Larger image sizes
* Page breaks between posts
* Print-safe typography
