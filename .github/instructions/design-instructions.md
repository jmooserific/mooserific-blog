---
applyTo: '**'
---
Let’s design a clean, modern, and family-friendly blog layout that focuses on **simplicity**, **photography**, and **longevity** — optimized for readability, photo viewing, and export-to-photo-book use. Responsiveness and accessibility are musts.

We want something that feels calm, personal, and clutter-free — like a digital family album.

---

## 🧱 Layout Structure

### 🏠 Homepage (`/`)

* **Centered column layout**, max width around `700px–900px`
* **Each post**:

  * Subtle card-style container
  * Top-right: Date & author in small gray text
  * Middle: Text (caption/description)
  * Bottom: Tiled/mosaic photo gallery

---

### Filtering
Our family blog will contain hundreds of posts made over the past decade. It is essential that there be a good way to filter the homepage to a certain year and, optionally, month, day, and time. A "filter" icon should be displayed at the top-right of the homepage. When clicked, it should open a popover component that shows a date picker.

When a date filter is specified, it should be passed as a param to the homepage. The param format should resemble the post date format. For example:
  * `?date_filter=2021-07-26T08-34`: Show the post from July 26, 2021 at 08:34
  * `?date_filter=2021-07-26`: Show all posts from July 26, 2021
  * `?date_filter=2021-07`: Show all posts from July 2021
  * `?date_filter=2021`: Show all posts from 2021

If there are no posts for the specified date filter, show a nice message.

This mechanism will replace the traditional blog post "permalink" mechanism.

In the future, we may add additional filtering mechanisms, like tags or authors.

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

When a photo is clicked, it should open a `yet-another-react-lightbox` lightbox for a full-size slideshow of the images in that gallery, starting with the photo that was clicked.

---

## ✏️ Font Pairing

Use a humanist, friendly typeface:

* Base: `Inter` or `system-ui`
* Optionally add `Playfair Display` or `DM Serif Text` for date/author for a print-style vibe
* Optionally add `Sign Painter` to the site title for some flair

---

## 🧭 Optional Features (Nice to Have)

| Feature                    | Description                                |
| -------------------------- | ------------------------------------------ |
| Light/dark mode toggle     | Subtle toggle in footer                    |
| Year/month archive sidebar | Clickable list of dates in sidebar         |
| Pagination                 | 10 posts per page with infinite scrolling  |
| Videos                     | Support for (single) video posts           |
| “Print view”               | Stripped-down style with large photos      |

---

## 📚 Export Consideration

Use consistent spacing and fonts that will render well in a PDF. Later, your `print.css` or `print-view.tsx` can apply:

* Larger image sizes
* Page breaks between posts
* Print-safe typography
