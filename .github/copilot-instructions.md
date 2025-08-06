# Copilot Instructions for Mooserific Blog

## Big Picture Architecture
- **Mooserific Blog** is a private family photo blog built with Next.js (App Router) and Tailwind CSS, designed for filesystem-based post storage (no external DB).
- **Posts** are stored in `/posts/YYYY-MM-DDTHH-MM/` folders, each containing a `post.json` and photo/video files. The app reads these directly from the filesystem.
- **Homepage (`/`)** lists posts in descending date order. Posts can be filtered by date.
- **Admin UI (`/admin`)** allows authenticated users (via reverse proxy) to create posts by uploading images and entering captions. Auth is handled externally; capture the `Authorization` or `X-Authenticated-User` header for the author field.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Run locally:** `npm run dev`
- **Build for production:** `npm run build`
- **Docker:** See `Dockerfile` for containerization steps.
- **No database migrations or ORM setup required.**

## Project-Specific Conventions
- **Posts**: Each post folder uses ISO date/time as its slug (e.g., `2025-07-26T14-42`).
- **post.json** format:
  ```json
  {
    "date": "2025-07-26T14:42:00", // required
    "author": "vemoose", // optional
    "caption": "Short paragraph of text here...", // optional
    "photos": [
      { "filename": "01.jpg", "width": 800, "height": 600 },
      { "filename": "02.jpg", "width": 1200, "height": 900 }
    ], // optional
    "videos": ["clip1.mp4", "clip2.mp4"] // optional
  }
  ```
- **Image/Video access**: Images/Videos are served from `/posts/[slug]/[filename]`.
- **Styling**: Use Tailwind CSS utility classes. Global styles in `src/globals.css`.
- **Photo gallery**: Use `react-photo-album` for responsive image layouts and `yet-another-react-lightbox` for image lightboxes.
- **Videos**: Use simple HTML5 `<video>` tags for video playback.
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
1. Admin UI receives drag-and-drop images/videos and caption.
2. On submit, create `/posts/YYYY-MM-DDTHH-MM/` folder.
3. Save `post.json` and image/video files.
4. Author field is set from request header.

# Next.js + Tailwind + TypeScript Development Instructions

Instructions for generating high-quality Next.js applications with Tailwind CSS styling and TypeScript.

## Project Context
-   Latest Next.js (App Router preferred)
-   Use Next.js built-in components when appropriate (e.g., `Image`, `Link`, `Head`)
-   Be sure to consider the versions of Next.js and React in use
-   TypeScript for type safety and strong typing
-   Tailwind CSS for all styling

## Development Standards
### Architecture
-   Organize routes and components by feature or domain.

### TypeScript
-   Always define explicit interfaces or types for props, state, and API responses.
-   Use `async/await` for asynchronous operations and include robust error handling.

### Styling
-   Utilize Tailwind CSS classes for all styling.
-   Implement responsive design using Tailwind's utility classes (e.g., `md:`, `lg:`).

### Components
-   Create reusable and modular components.
-   Destructure props in component signatures.
-   Use React Fragments (`<>...</>`) to avoid unnecessary DOM elements.

### Performance
-   Minimize client-side rendering where server components can be used.
-   Implement lazy loading for non-critical components using `React.lazy` and `Suspense`.


---
For questions about conventions or unclear patterns, review `README.md` or ask for clarification.
