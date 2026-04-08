# Mooserific Blog

<p align="center">
  <img src="https://raw.githubusercontent.com/jmooserific/mooserific-blog/refs/heads/main/public/Screenshot.png" alt="screenshot of Mooserific Blog" style="max-width: 800px;"/>
</p>

A private, family-friendly blog for sharing photos and videos. Upload memories, add a caption, and they show up in a clean, scrollable feed — no social media required.

## What it does

- **Photo & video posts** — drop in up to 20 photos or videos per post, with an optional description
- **Beautiful photo grids** — responsive layouts with a full-screen lightbox for browsing
- **Video playback** — MP4s play right in the feed
- **Fast image loading** — photos are automatically optimized on upload for quick loading on any device
- **Date filtering** — browse by month or jump to a specific date
- **Admin UI** — drag-and-drop post creation, only accessible to you

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up your environment**

   ```bash
   cp .env.example .env.local
   # fill in your Cloudflare R2, D1, and auth credentials
   ```

3. **Set up the database** (first time only)

   ```bash
   npx wrangler d1 migrations apply <DB_NAME>
   ```

4. **Run locally**

   ```bash
   npm run dev
   ```

   Then visit `http://localhost:3000/login` to sign in and start posting.

## Deploying

Push to GitHub, import into Vercel, add your environment variables, and deploy. That's it.

## Environment variables

```env
R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=       # public URL of your R2 bucket
D1_DATABASE_ID=
CF_API_TOKEN=
ENVIRONMENT=development   # or production
ADMIN_USERNAME=
ADMIN_PASSWORD=
SESSION_SECRET=
MAX_FILE_BYTES=           # optional, default 500 MB
```

## License

See `LICENSE`.
