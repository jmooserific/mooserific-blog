# Copilot Instructions for Blogify

## Big Picture Architecture
- **Blogify** is a private photo blog built with Next.js (App Router) and Tailwind CSS, designed for filesystem-based post storage (no external DB).
- **Posts** are stored in `/posts/YYYY-MM-DDTHH-MM/` folders, each containing a `post.json` and photo files. The app reads these directly from the filesystem.
- **Homepage (`/`)** lists posts in descending date order. Individual posts are accessed via `/[year]/[month]/[day]/[slug]`.
- **Admin UI (`/admin`)** allows authenticated users (via reverse proxy) to create posts by uploading images and entering captions. Auth is handled externally; capture the `Authorization` or `X-Authenticated-User` header for the author field.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Run locally:** `npm run dev`
- **Build for production:** `npm run build`
- **Docker:** See `Dockerfile` for containerization steps.
- **No database migrations or ORM setup required.**

## Project-Specific Conventions
- **Posts**: Each post folder uses ISO date/time as its slug (e.g., `2025-07-26T14-42`).
- **post.json** format (with image sizes):
  ```json
  {
    "date": "2025-07-26T14:42:00",
    "author": "vemoose",
    "caption": "Short paragraph of text here...",
    "photos": [
      { "filename": "01.jpg", "width": 800, "height": 600 },
      { "filename": "02.jpg", "width": 1200, "height": 900 }
    ]
  }
  ```
- **Image access**: Images are served from `/posts/[slug]/[filename]`.
- **Styling**: Use Tailwind CSS utility classes. Global styles in `src/globals.css`.
- **Photo gallery**: Use `react-photo-album` for responsive image layouts.
- **Admin UI**: Drag-and-drop for up to 10 images, Markdown/WYSIWYG caption, creates post folder and saves files.

## Integration Points & Patterns
- **Auth**: No login UI; rely on reverse proxy. Always check for `Authorization` or `X-Authenticated-User` header in admin routes.
- **File I/O**: Use Node.js `fs` and `path` modules for reading/writing posts and images. Avoid database code.
- **Routing**: Next.js App Router structure in `src/app/`. Add new pages as needed.
- **Extensibility**: Add new post fields or admin features by updating `post.json` schema and UI forms.

## Key Files & Directories
- `/posts/` — All post folders and images
- `/src/app/` — Next.js pages and admin UI
- `/src/globals.css` — Tailwind CSS setup
- `/Dockerfile` — Containerization
- `/README.md` — Project overview and conventions

## Example: Creating a Post
1. Admin UI receives drag-and-drop images and caption.
2. On submit, create `/posts/YYYY-MM-DDTHH-MM/` folder.
3. Save `post.json` and image files.
4. Author field is set from request header.

---
For questions about conventions or unclear patterns, review `README.md` or ask for clarification.
