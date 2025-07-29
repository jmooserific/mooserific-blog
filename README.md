# Mooserific Blog!

<p align="center">
  <img src="https://raw.githubusercontent.com/jmooserific/mooserific-blog/refs/heads/main/public/Screenshot.png" alt="screenshot of Mooserific Blog" style="max-width: 800px;"/>
</p>

A private, family-oriented photo blog built with Next.js (App Router), styled with Tailwind CSS, and designed for filesystem-based post storage. Hosted via Docker on Synology NAS.

## Features
- Tiled galleries with fullscreen "lightbox" photo viewing
- Posts stored as folders in `/posts/YYYY-MM-DDTHH-MM/` with `post.json` and photo files
- Homepage displays latest posts or posts from the specified year/month/day in descending order
- Admin UI for uploading photos and creating posts
- No external database
- Auth handled via reverse proxy (HTTP Basic Auth)

## Getting Started
1. Install dependencies: `npm install`
2. Run locally: `npm run dev`
3. Build for production: `npm run build`
4. Run in Docker (see `Dockerfile`)

## Folder Structure
- `/posts` — All post folders and images
- `/src` — Next.js app code
- `/public` — Static assets


## Sample Post Format
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

## Routes
- `/` — Homepage (shows all posts, or filtered by date)
- `/?date_filter=YYYY`, `/?date_filter=YYYY-MM`, `/?date_filter=YYYY-MM-DD`, `/?date_filter=YYYY-MM-DDTHH-MM` — Filter posts by year, month, day, or timestamp
- `/posts/[slug]/[filename]` — Serve post images
- `/admin` — Editor UI (protected externally)
