# Mooserific Blog!

A private, family-oriented photo blog built with Next.js (App Router), styled with Tailwind CSS, and designed for filesystem-based post storage. Hosted via Docker on Synology NAS.

## Features
- Posts stored as folders in `/posts/YYYY-MM-DDTHH-MM/` with `post.json` and photo files
- Homepage displays latest posts in descending order
- Individual post pages
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
```
{
  "date": "2025-07-26T14:42:00",
  "author": "vemoose",
  "caption": "Short paragraph of text here...",
  "photos": ["01.jpg", "02.jpg", "03.jpg"]
}
```

## Routes
- `/` — Homepage
- `/[year]/[month]/[day]/[slug]` — Individual post
- `/admin` — Editor UI (protected externally)
