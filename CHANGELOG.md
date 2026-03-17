# NetScope v2 - Major Update (March 16, 2026)

## 🎯 Overview
Complete refactor to support real event discovery, web scraping, and Vercel serverless deployment.

## ✅ Completed Changes

### 1. Eventbrite API Integration
- ✅ Created `/app/api/discover/route.ts` - POST endpoint that triggers event discovery
- ✅ Implemented `/lib/scrapers/eventbrite.ts` - Fetches events from Eventbrite API v3
- ✅ API searches for Chicago events in Business, Tech, and Networking categories
- ✅ API key stored in environment variable `EVENTBRITE_API_KEY`
- ✅ Maps Eventbrite event data to NetScope Event schema

### 2. Web Scrapers
Created `/lib/scrapers/` directory with:
- ✅ `eventbrite.ts` - API-based fetcher (primary source)
- ✅ `luma.ts` - Scrapes lu.ma/chicago for community events
- ✅ `builtin-chicago.ts` - Scrapes builtinchicago.org/events
- ✅ `index.ts` - Aggregator that runs all sources and deduplicates

Scraping features:
- ✅ Uses `cheerio` for HTML parsing
- ✅ Handles structured data (JSON-LD) when available
- ✅ Fallback HTML scraping for less structured sites
- ✅ Fuzzy deduplication by title + date

### 3. Vercel Serverless Compatibility
**CRITICAL CHANGES** - No more file-based SQLite:
- ✅ Created `/lib/seed-data.ts` with clubs and sample events as TypeScript constants
- ✅ Created `/lib/data-store.ts` - In-memory data store (singleton pattern)
- ✅ Removed `sql.js` dependency and all file I/O operations
- ✅ User preferences (saved/dismissed) now stored client-side in localStorage
- ✅ All API routes refactored to use in-memory data store
- ✅ Build succeeds with zero file system dependencies

### 4. UI Enhancements
- ✅ Added "Discover Events" button to home page (`/app/page.tsx`)
- ✅ Button triggers `/api/discover` POST endpoint
- ✅ Loading state with spinning icon during discovery
- ✅ Success/error alerts after discovery completes
- ✅ Updated saved events page to use localStorage
- ✅ Client-side filtering of dismissed events

### 5. Data Management
- ✅ Events persist in memory across requests (serverless cold starts reload seed data)
- ✅ User actions (save/dismiss) stored in browser localStorage:
  - `netscope-saved-events` - Array of saved event IDs
  - `netscope-dismissed-events` - Array of dismissed event IDs
- ✅ Server serves all active events; client filters based on localStorage

### 6. Configuration & Cleanup
- ✅ Updated `.env.example` with Eventbrite API key placeholder
- ✅ Created `.env` with actual API key (gitignored)
- ✅ Removed `db:init` script from package.json
- ✅ Deleted `/data/` directory (no longer needed)
- ✅ Deleted `/scripts/init-db.js` (no longer needed)
- ✅ Deleted `/lib/db.ts` (replaced by data-store.ts)
- ✅ Added `vercel.json` for deployment configuration
- ✅ Removed `sql.js` from dependencies
- ✅ Added `cheerio` to dependencies

### 7. Git & Deployment
- ✅ All changes committed with descriptive message
- ✅ Pushed to `origin main` (2 commits)
- ✅ Build tested and succeeds (`npm run build`)
- ✅ Ready for Vercel deployment

## 📦 Dependencies Added
- `cheerio` (^1.2.0) - HTML parsing for web scraping

## 🗑️ Dependencies Removed
- `sql.js` - No longer needed (incompatible with Vercel serverless)

## 🚀 How to Deploy to Vercel
1. Push code to GitHub (already done ✅)
2. Connect GitHub repo to Vercel
3. Add environment variable in Vercel dashboard:
   - `EVENTBRITE_API_KEY` = `EZGAWPKVSHKVJRKOZ7UE`
4. Deploy! (Vercel will automatically run `npm run build`)

## 🧪 How to Test Locally
```bash
npm install
npm run dev
# Visit http://localhost:3000
# Click "Discover Events" button to fetch real events
```

## 📋 API Endpoints
- `GET /api/events` - List all events (with filters)
- `PATCH /api/events` - Update event status (kept for potential future use)
- `GET /api/clubs` - List all clubs (with filters)
- `PATCH /api/clubs` - Update club status
- `POST /api/discover` - Trigger event discovery from all sources
- `GET /api/discover` - Info about discovery sources

## 🎨 Dark Mode Design
- ✅ All existing styling preserved
- ✅ No visual changes to components
- ✅ Dark theme remains intact

## 📝 Notes for Future Work
- Consider adding rate limiting to `/api/discover` (prevent abuse)
- Consider caching discovered events (maybe Redis on Vercel KV)
- Could add more event sources (Meetup.com, Eventbrite trending, etc.)
- Could improve scraper error handling and retries
- Could add email notifications for new discovered events matching user preferences
