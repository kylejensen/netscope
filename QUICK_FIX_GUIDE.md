# NetScope Scraper Quick Fix Guide

**READ THIS FIRST** — 5-minute summary of the full audit report

---

## The Problem

✅ Data exists on Eventbrite and Luma pages  
❌ Our parsers are extracting it incorrectly  
❌ Built In Chicago has a broken redirect

---

## The Solution (Priority Order)

### 1. Fix Luma (10 mins, HIGH IMPACT) 🔥

**File:** `/lib/scrapers/luma.ts`

**The Bug:**
```typescript
// WRONG (current code)
const eventList = pageProps?.initialData?.featured_items || [];
for (const item of eventList) {
  if (!item.name) continue; // ❌ item.name doesn't exist!
}
```

**The Fix:**
```typescript
// RIGHT
const eventList = nextData?.props?.pageProps?.initialData?.data?.events || [];
for (const item of eventList) {
  const event = item.event; // ← KEY: nested object!
  if (!event || !event.name) continue;
  
  // Use event.name, event.start_at, event.url, etc.
  const fullUrl = `https://lu.ma/${event.url}`;
  // ... rest of mapping
}
```

**Expected Result:** 15-25 events from Luma

---

### 2. Fix Eventbrite (15 mins, HIGH IMPACT) 🔥

**File:** `/lib/scrapers/eventbrite.ts`

**The Bug:**
- `window.__SERVER_DATA__` parsing fails silently
- Fallback regex pairs names incorrectly
- Missing date fields

**The Fix:**
```typescript
// Better regex (less greedy)
const match = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});[\s\n]*<\/script>/s);

// Try multiple paths
const events = serverData?.search_data?.events?.results || 
               serverData?.events?.results || [];

// Handle date variations
start_date: result.start?.local || result.start_date || result.startDate || '',
```

**Also add:**
- `console.log()` statements to debug which path works
- Better null checks

**Expected Result:** 10-30 events from Eventbrite

---

### 3. Remove Built In Chicago (2 mins) ❌

**Why:** Website has malformed 301 redirect. Not worth fixing.

**How:**
```bash
# 1. Delete the file
rm /data/.openclaw/workspace/netscope/lib/scrapers/builtin-chicago.ts

# 2. Update index.ts
# Remove this line:
# import { scrapeBuiltInChicago } from './builtin-chicago';

# Remove from Promise.allSettled:
# scrapeBuiltInChicago(),
```

---

### 4. Add Ticketmaster API (20 mins, HIGHEST YIELD) ⭐

**Why:** Official API with 30-50 Chicago events, free, well-maintained

**Steps:**

1. **Get API key** (2 mins)
   - Sign up at https://developer.ticketmaster.com/
   - Get free API key

2. **Add to `.env`**
   ```bash
   TICKETMASTER_API_KEY=your_key_here
   ```

3. **Create `/lib/scrapers/ticketmaster.ts`** (see full code in audit report)

4. **Add to `/lib/scrapers/index.ts`**
   ```typescript
   import { scrapeTicketmaster } from './ticketmaster';
   
   // In Promise.allSettled:
   scrapeTicketmaster(),
   ```

**Expected Result:** 30-50 events from Ticketmaster

---

## Testing

```bash
# Test the discovery endpoint
curl -X POST http://localhost:3000/api/discover

# Should return JSON with 55-105 total events
```

---

## Vercel Deployment

1. Add environment variable in Vercel dashboard:
   - Key: `TICKETMASTER_API_KEY`
   - Value: your API key

2. Deploy and test:
   ```bash
   vercel deploy
   curl -X POST https://your-app.vercel.app/api/discover
   ```

---

## Expected Results

| Source | Before | After |
|--------|--------|-------|
| Eventbrite | 0 | 10-30 |
| Luma | 0 | 15-25 |
| Built In | 0 | removed |
| Ticketmaster | n/a | 30-50 |
| **TOTAL** | **0** | **55-105** |

---

## Full Details

See `SCRAPER_AUDIT_REPORT.md` for:
- Complete code examples
- Root cause analysis for each scraper
- Vercel serverless compatibility notes
- Testing plan
- Alternative sources to consider

---

## Questions?

- **Where's the full code?** → See Section 3 of `SCRAPER_AUDIT_REPORT.md`
- **Why is Built In broken?** → 301 redirect with malformed location header
- **Do I need Ticketmaster?** → No, but it adds 50% more events
- **Will this work on Vercel free tier?** → Yes, well under 10s timeout
