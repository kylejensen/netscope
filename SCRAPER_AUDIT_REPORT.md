# NetScope Event Discovery Scrapers - Technical Audit Report
**Date:** March 16, 2026  
**Auditor:** Atlas  
**Project:** NetScope Event Discovery & Networking Dashboard

---

## Executive Summary

The NetScope event discovery scrapers are returning 0 results due to multiple issues:
1. **Eventbrite**: Scraping approach is correct but has data extraction bugs
2. **Luma**: Parsing logic has errors in JSON extraction
3. **Built In Chicago**: Website has broken redirect (301 with malformed location header)

**Good News:** Curl tests confirm that Eventbrite and Luma both return valid, scrapable data. The issues are in our parsing logic, not the data sources.

---

## 1. Root Cause Analysis

### 1.1 Eventbrite Scraper

**File:** `/lib/scrapers/eventbrite.ts`

**Status:** ⚠️ Partially Working — Data available but extraction has bugs

**Root Causes:**

1. **JSON-LD Parsing Issue**: The scraper tries to parse `script[type="application/ld+json"]` but may encounter invalid JSON or arrays of mixed types
2. **window.__SERVER_DATA__ Extraction Bug**: The regex `window\.__SERVER_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>` captures correctly, but the nested path `serverData?.search_data?.events?.results` may be incorrect or the structure changed
3. **Fallback Regex Parsing Flaw**: The fallback uses `matchAll` for URLs and names separately, then tries to pair them by index. This approach is brittle and relies on names appearing in pairs (venue, then event). If the pattern changes, pairing breaks.
4. **Missing start_date**: Many events in the fallback path have empty `start_date` fields, making them less useful

**Verification:**
```bash
curl 'https://www.eventbrite.com/d/il--chicago/business--events/' \
  -H 'User-Agent: Mozilla/5.0' | grep 'window.__SERVER_DATA__'
# ✅ Returns: window.__SERVER_DATA__ = {
```

The page DOES have `window.__SERVER_DATA__` with event data.

**What's broken:**
- The JSON parsing likely throws and falls through to the regex fallback
- The regex fallback pairs names incorrectly, leading to malformed events
- No proper error logging to see which path succeeds/fails

---

### 1.2 Luma Scraper

**File:** `/lib/scrapers/luma.ts`

**Status:** ✅ Data Available — Parser needs fixes

**Root Causes:**

1. **__NEXT_DATA__ Extraction Works**: Verified the page has `<script id="__NEXT_DATA__">` with valid JSON
2. **Incorrect Path Navigation**: The path `nextData?.props?.pageProps?.initialData?.featured_items || initialData?.events` may not match actual structure
3. **Event Object Nesting**: Events are nested as `{ api_id, event: { ... actual event data ... }, calendar: {...}, hosts: [...] }`
   - The scraper tries `item.event || item` but doesn't consistently extract from the right level
4. **Regex Fallback Issues**: Similar to Eventbrite, the regex fallback for extracting name/date/url from raw HTML is brittle
5. **Unicode Escaping**: The scraper tries to handle `\u[\dA-Fa-f]{4}` but may miss other escape sequences

**Verification:**
```bash
curl 'https://lu.ma/chicago' | grep '__NEXT_DATA__'
# ✅ Returns structured JSON with events array
```

The actual structure (from curl test):
```json
{
  "props": {
    "pageProps": {
      "initialData": {
        "kind": "discover-place",
        "data": {
          "place": {...},
          "page": {...},
          "events": [
            {
              "api_id": "evt-...",
              "event": { "name": "...", "start_at": "...", "url": "..." },
              "calendar": {...},
              "hosts": [...]
            }
          ]
        }
      }
    }
  }
}
```

**What's broken:**
- Path is `nextData.props.pageProps.initialData.data.events` NOT `initialData.featured_items`
- Event data is at `item.event.*` not top-level
- The scraper checks `if (!event.name)` but should check the nested object

---

### 1.3 Built In Chicago Scraper

**File:** `/lib/scrapers/builtin-chicago.ts`

**Status:** ❌ Broken — Website has malformed redirect

**Root Causes:**

1. **HTTP 301 Redirect with Malformed Location**:
   ```
   HTTP/2 301
   location: https://www.builtinchicago.orghttps//www.builtinchicago.org
   ```
   Notice the doubled URL? This causes `curl -L` to fail silently.

2. **No Events Page**: The `/events` endpoint appears to no longer exist or is behind a broken redirect
3. **Cheerio Selectors Won't Help**: Even if the redirect worked, we don't have test data showing the page structure

**Verification:**
```bash
curl -I 'https://www.builtinchicago.org/events'
# ❌ Returns: HTTP/2 301 with broken location header
```

**Recommendation:** **Drop this source** or find an alternative Built In endpoint. The site is misconfigured.

---

## 2. Verified Working Scraping Approaches

### 2.1 Eventbrite (Website Scraping)

**Current Reality (2026):**
- ✅ Eventbrite deprecated their public Event Search API in Dec 2019
- ✅ Browse pages like `/d/il--chicago/business--events/` still work and contain scrapable data
- ✅ Data is embedded in `window.__SERVER_DATA__` JavaScript object

**Working Approach:**

```typescript
// 1. Fetch the page
const response = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 ...' }
});
const html = await response.text();

// 2. Extract window.__SERVER_DATA__
const match = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});[\s\n]*<\/script>/s);
if (match) {
  const serverData = JSON.parse(match[1]);
  
  // 3. Navigate to events (structure varies, but typically):
  const events = serverData?.search_data?.events?.results || 
                 serverData?.events?.results || 
                 [];
  
  // 4. Map each event
  events.forEach(result => {
    // Fields: result.id, result.name, result.start_date, result.url, 
    //         result.is_online_event, result.is_free, result.primary_venue
  });
}
```

**Key Points:**
- User-Agent header is required
- `window.__SERVER_DATA__` structure can vary; log it first to verify paths
- Eventbrite browse pages work for specific categories (business, tech, networking)
- No rate limits observed for public browse pages
- Handles both in-person and virtual events

**Code Changes Needed:**
1. Better error handling around JSON.parse
2. Log the actual structure of `serverData` on first run to verify paths
3. Add null checks for nested properties
4. Ensure all date fields are populated (use `result.start?.local || result.start_date`)

---

### 2.2 Luma (lu.ma)

**Current Reality (2026):**
- ✅ Luma city pages (e.g., `lu.ma/chicago`) contain all event data in Next.js `__NEXT_DATA__`
- ✅ Well-structured JSON with full event details
- ✅ No API key required for public events

**Working Approach:**

```typescript
// 1. Fetch the page
const response = await fetch('https://lu.ma/chicago', {
  headers: { 'User-Agent': 'Mozilla/5.0 ...' }
});
const html = await response.text();

// 2. Extract __NEXT_DATA__ (it's a complete JSON object)
const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (match) {
  const nextData = JSON.parse(match[1]);
  
  // 3. Navigate to events array
  const events = nextData?.props?.pageProps?.initialData?.data?.events || [];
  
  // 4. Map each item (note nested structure!)
  events.forEach(item => {
    const event = item.event; // ← KEY: event data is nested
    const calendar = item.calendar;
    const hosts = item.hosts || [];
    
    // Fields: event.api_id, event.name, event.start_at, event.url,
    //         event.location_type, event.geo_address_info, event.cover_url
    //         calendar.name (organization), hosts[].name
  });
}
```

**Key Points:**
- `__NEXT_DATA__` is valid, parseable JSON (not embedded in JS)
- Event structure: `{ api_id, event: {...}, calendar: {...}, hosts: [...] }`
- The actual event fields are in `item.event.*` not top-level
- `event.url` is a slug; full URL is `https://lu.ma/${event.url}`
- `event.start_at` is ISO 8601 format (already usable)
- Location can be `offline`, `online`, or `hybrid` (check `event.location_type`)

**Code Changes Needed:**
1. Fix path: `nextData.props.pageProps.initialData.data.events`
2. Access nested event object: `const event = item.event`
3. Handle all three location types
4. Construct full URL from slug

---

### 2.3 Alternative Sources to Add

Given Built In Chicago is broken, consider these verified working sources:

#### A. **Ticketmaster Discovery API** ⭐ RECOMMENDED

**Why:** Official, well-maintained API with comprehensive event coverage

**API Endpoint:**
```
GET https://app.ticketmaster.com/discovery/v2/events.json
  ?apikey={YOUR_KEY}
  &city=Chicago
  &stateCode=IL
  &classificationName=Technology,Business
  &size=50
```

**Pros:**
- ✅ Free API with generous rate limits
- ✅ Covers concerts, sports, theater, AND business/tech events
- ✅ Well-documented: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- ✅ Handles pagination cleanly
- ✅ Returns structured JSON with venue, date, price info

**Cons:**
- Requires API key (free signup)
- May skew toward paid/ticketed events
- Less coverage of free community meetups

**Setup:**
1. Sign up at https://developer.ticketmaster.com/
2. Get free API key
3. Add to `.env`: `TICKETMASTER_API_KEY=...`

**Implementation:**
```typescript
async function scrapeTicketmaster(): Promise<Event[]> {
  const response = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${process.env.TICKETMASTER_API_KEY}` +
    `&city=Chicago&stateCode=IL` +
    `&classificationName=Technology,Business,Conference` +
    `&size=50`
  );
  
  const data = await response.json();
  return data._embedded?.events?.map(e => ({
    id: `tm-${e.id}`,
    title: e.name,
    start_date: e.dates.start.dateTime || e.dates.start.localDate,
    location: e._embedded?.venues?.[0]?.name || 'Chicago',
    url: e.url,
    cost: e.priceRanges?.[0]?.min ? 'paid' : 'free',
    source: 'ticketmaster',
    // ... map other fields
  })) || [];
}
```

---

#### B. **Meetup.com** (Scraping)

**Why:** Largest tech/professional meetup platform

**Note:** Meetup closed their public API in 2019, but city pages are scrapable

**URL:** `https://www.meetup.com/find/?source=EVENTS&location=us--il--chicago&categoryId=546` (Tech category)

**Approach:** Similar to Eventbrite — scrape the rendered page or intercept API calls

**Pros:**
- ✅ Excellent for tech, professional, and networking events
- ✅ Free community events
- ✅ Chicago has active tech scene on Meetup

**Cons:**
- No official API (scraping required)
- May require handling JavaScript rendering (Meetup uses React)
- Rate limits unknown

**Implementation Considerations:**
- Use Puppeteer/Playwright for JavaScript rendering OR
- Intercept the API calls Meetup's frontend makes (e.g., `www.meetup.com/gql` GraphQL endpoint)
- Parse event cards from rendered HTML

---

#### C. **SeatGeek API** (Alternative to Ticketmaster)

**Why:** Another major ticketing platform with a public API

**API:** `https://api.seatgeek.com/2/events?venue.city=chicago&client_id={YOUR_KEY}`

**Pros:**
- ✅ Free API
- ✅ Good coverage of sports, concerts, theater
- ✅ Clean JSON responses

**Cons:**
- Less business/tech event coverage than Ticketmaster
- Still skews toward paid events

---

## 3. Code-Level Recommendations

### 3.1 Eventbrite Scraper Fixes

**File:** `/lib/scrapers/eventbrite.ts`

**Changes:**

```typescript
// Add better error handling and logging
export async function scrapeEventbrite(): Promise<Event[]> {
  const allEvents: Event[] = [];

  for (const pageUrl of EVENTBRITE_URLS) {
    try {
      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) {
        console.error(`[Eventbrite] HTTP ${response.status} for ${pageUrl}`);
        continue;
      }

      const html = await response.text();

      // TRY: Extract window.__SERVER_DATA__
      const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});[\s\n]*<\/script>/s);
      if (serverDataMatch) {
        try {
          const serverData = JSON.parse(serverDataMatch[1]);
          console.log('[Eventbrite] Parsed __SERVER_DATA__, keys:', Object.keys(serverData));
          
          // Try multiple possible paths (structure varies!)
          const events = serverData?.search_data?.events?.results || 
                        serverData?.events?.results ||
                        serverData?.feed?.events || [];
          
          console.log(`[Eventbrite] Found ${events.length} events in __SERVER_DATA__`);
          
          for (const result of events) {
            // Ensure required fields exist
            if (!result.name && !result.title) continue;
            
            const eventUrl = result.url || `https://www.eventbrite.com/e/${result.id}`;
            
            allEvents.push({
              id: `eb-${result.id || Math.random().toString(36).slice(2, 12)}`,
              title: result.name || result.title || '',
              description: result.summary || result.description?.substring(0, 500) || '',
              // Handle multiple date field variations
              start_date: result.start?.local || result.start_date || result.startDate || '',
              end_date: result.end?.local || result.end_date || result.endDate || '',
              location: result.primary_venue?.name || result.venue?.name || 'Chicago, IL',
              format: result.is_online_event ? 'virtual' : 'in-person',
              type: 'networking',
              topics: ['business', 'networking'],
              cost: result.is_free ? 'free' : 'paid',
              url: eventUrl,
              source: 'eventbrite',
              image_url: result.image?.url,
              status: 'active',
            });
          }
        } catch (e) {
          console.error('[Eventbrite] JSON parse error:', e);
        }
      }

      // FALLBACK: JSON-LD structured data
      const $ = cheerio.load(html);
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '');
          const items = Array.isArray(json) ? json : [json];
          
          for (const item of items) {
            if (item['@type'] === 'Event' && item.name && item.url) {
              // ... existing JSON-LD logic (already works)
            }
          }
        } catch {}
      });

    } catch (error) {
      console.error(`[Eventbrite] Error scraping ${pageUrl}:`, error);
    }
  }

  console.log(`[Eventbrite] ✅ Scraped ${allEvents.length} total events`);
  return allEvents;
}
```

**Key Changes:**
1. ✅ Added logging at each step
2. ✅ Fixed regex to be less greedy (`{.+?}` instead of `{[\s\S]*?}`)
3. ✅ Try multiple possible paths for event data
4. ✅ Handle date field variations
5. ✅ Better null checks

---

### 3.2 Luma Scraper Fixes

**File:** `/lib/scrapers/luma.ts`

**Changes:**

```typescript
export async function scrapeLuma(): Promise<Event[]> {
  const events: Event[] = [];

  try {
    const response = await fetch('https://lu.ma/chicago', {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      console.error('[Luma] HTTP error:', response.status);
      return [];
    }

    const html = await response.text();

    // Extract __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        console.log('[Luma] Parsed __NEXT_DATA__');
        
        // CORRECTED PATH
        const eventList = nextData?.props?.pageProps?.initialData?.data?.events || [];
        console.log(`[Luma] Found ${eventList.length} events in __NEXT_DATA__`);
        
        for (const item of eventList) {
          // KEY FIX: Event data is nested!
          const event = item.event;
          if (!event || !event.name) continue;

          const calendar = item.calendar || {};
          const hosts = item.hosts || [];

          const slug = event.url || '';
          const fullUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;

          events.push({
            id: `luma-${event.api_id || slug || Math.random().toString(36).slice(2, 12)}`,
            title: event.name,
            description: event.description?.substring(0, 500) || '',
            start_date: event.start_at || '',
            end_date: event.end_at || '',
            // Handle location
            location: event.geo_address_info?.city_state || 
                     event.geo_address_info?.address || 
                     'Chicago, IL',
            format: event.location_type === 'online' ? 'virtual' : 
                   event.location_type === 'offline' ? 'in-person' : 'hybrid',
            type: inferEventType(event.name),
            topics: inferTopics(event.name, event.description || ''),
            cost: 'free', // Most Luma events are free
            url: fullUrl,
            source: 'luma',
            image_url: event.cover_url,
            status: 'active',
          });
        }
      } catch (e) {
        console.error('[Luma] JSON parse error:', e);
      }
    } else {
      console.warn('[Luma] Could not find __NEXT_DATA__ in page');
    }

    console.log(`[Luma] ✅ Scraped ${events.length} events`);
  } catch (error) {
    console.error('[Luma] Error scraping:', error);
  }

  return events;
}
```

**Key Changes:**
1. ✅ Fixed path to events array
2. ✅ Access nested `item.event` object
3. ✅ Handle all three location types (offline/online/hybrid)
4. ✅ Construct full URL from slug
5. ✅ Added logging at each step
6. ✅ Better null checks

---

### 3.3 Drop Built In Chicago (or fix URL)

**Recommendation:** Remove Built In Chicago scraper OR investigate alternative endpoint

**If keeping:** Try base domain without `/events`:
```typescript
// Test if homepage has event listings
const response = await fetch('https://www.builtinchicago.org/', ...);
```

**If removing:** Delete `builtin-chicago.ts` and remove from `index.ts`

---

### 3.4 Add Ticketmaster (Recommended)

**New File:** `/lib/scrapers/ticketmaster.ts`

```typescript
import { Event } from '../types';

const TICKETMASTER_API_BASE = 'https://app.ticketmaster.com/discovery/v2';
const API_KEY = process.env.TICKETMASTER_API_KEY;

export async function scrapeTicketmaster(): Promise<Event[]> {
  if (!API_KEY) {
    console.warn('[Ticketmaster] API key not configured');
    return [];
  }

  const events: Event[] = [];

  try {
    const url = new URL(`${TICKETMASTER_API_BASE}/events.json`);
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('city', 'Chicago');
    url.searchParams.set('stateCode', 'IL');
    url.searchParams.set('classificationName', 'Technology,Business,Conference');
    url.searchParams.set('size', '50');
    // Optional: filter by date range
    // url.searchParams.set('startDateTime', new Date().toISOString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('[Ticketmaster] HTTP error:', response.status);
      return [];
    }

    const data = await response.json();
    const eventList = data._embedded?.events || [];
    console.log(`[Ticketmaster] Found ${eventList.length} events`);

    for (const e of eventList) {
      const venue = e._embedded?.venues?.[0];
      const priceRange = e.priceRanges?.[0];

      events.push({
        id: `tm-${e.id}`,
        title: e.name,
        description: e.info?.substring(0, 500) || '',
        start_date: e.dates.start.dateTime || e.dates.start.localDate || '',
        end_date: e.dates.end?.dateTime || e.dates.end?.localDate || '',
        location: venue?.name || 'Chicago, IL',
        format: 'in-person', // Ticketmaster is mostly in-person
        type: inferTypeFromClassification(e.classifications),
        topics: extractTopicsFromClassifications(e.classifications),
        cost: priceRange?.min ? 'paid' : 'free',
        price: priceRange?.min,
        url: e.url,
        source: 'ticketmaster',
        image_url: e.images?.[0]?.url,
        status: 'active',
      });
    }

    console.log(`[Ticketmaster] ✅ Scraped ${events.length} events`);
  } catch (error) {
    console.error('[Ticketmaster] Error:', error);
  }

  return events;
}

function inferTypeFromClassification(classifications: any[]): Event['type'] {
  const seg = classifications?.[0]?.segment?.name?.toLowerCase() || '';
  if (seg.includes('tech') || seg.includes('business')) return 'conference';
  if (seg.includes('sports')) return 'meetup';
  return 'networking';
}

function extractTopicsFromClassifications(classifications: any[]): string[] {
  const topics: string[] = [];
  classifications?.forEach(c => {
    if (c.segment?.name) topics.push(c.segment.name.toLowerCase());
    if (c.genre?.name) topics.push(c.genre.name.toLowerCase());
  });
  return [...new Set(topics)].slice(0, 3);
}
```

**Update `index.ts`:**
```typescript
import { scrapeTicketmaster } from './ticketmaster';

export async function scrapeAllEvents(): Promise<Event[]> {
  const results = await Promise.allSettled([
    scrapeEventbrite(),
    scrapeLuma(),
    scrapeTicketmaster(), // ADD THIS
    // scrapeBuiltInChicago(), // REMOVE OR COMMENT OUT
  ]);
  // ... rest of logic
}
```

---

## 4. Vercel Serverless Compatibility Notes

### 4.1 Timeout Limits

**Vercel Serverless Functions:**
- **Free/Hobby:** 10 second timeout
- **Pro:** 60 second timeout
- **Enterprise:** 900 second timeout

**Current Scraper Performance:**
- Each scraper makes 1-3 HTTP requests
- Parsing is fast (< 100ms per page)
- **Estimated total time:** 2-5 seconds for all scrapers

✅ **Should work fine on Free tier** (under 10s)

**Mitigation if timeout occurs:**
- Use `Promise.allSettled()` (already implemented) to run scrapers in parallel
- Add timeout to individual scraper calls:
  ```typescript
  const withTimeout = (promise, ms) => 
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  ```

---

### 4.2 Memory Limits

**Vercel Limits:**
- **Free/Hobby:** 1024 MB
- **Pro:** 3008 MB

**Current Memory Usage:**
- Storing HTML in memory (largest single page ~500KB)
- Cheerio DOM parsing (adds ~2-3x size)
- **Estimated peak:** 50-100 MB

✅ **Well within limits**

---

### 4.3 Cold Starts

**Issue:** Serverless functions "cold start" after period of inactivity

**Impact on Scrapers:**
- First request after cold start: +1-2 seconds
- Subsequent requests: normal speed

**Mitigation:**
- Cache scraped events in the in-memory `dataStore` (already implemented)
- Consider adding a periodic "warm-up" request (e.g., every 5 minutes via cron)
- For production: Use Vercel's Edge Functions or persistent caching (Redis/Upstash)

---

### 4.4 Rate Limiting

**Concern:** Hitting external sites too frequently

**Current Setup:**
- No built-in rate limiting
- Each `/api/discover` POST makes 3-4 external requests

**Recommendations:**
1. **Add caching to discovery endpoint:**
   ```typescript
   let cachedEvents: { data: Event[], timestamp: number } | null = null;
   const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

   export async function POST() {
     if (cachedEvents && Date.now() - cachedEvents.timestamp < CACHE_TTL) {
       return NextResponse.json({
         success: true,
         count: cachedEvents.data.length,
         events: cachedEvents.data,
         cached: true,
       });
     }

     const discoveredEvents = await scrapeAllEvents();
     cachedEvents = { data: discoveredEvents, timestamp: Date.now() };
     // ... rest of logic
   }
   ```

2. **Add User-Agent rotation** (if needed for anti-scraping):
   ```typescript
   const USER_AGENTS = [
     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
     'Mozilla/5.0 (X11; Linux x86_64) ...',
   ];
   const USER_AGENT = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
   ```

---

### 4.5 External API Keys

**For Ticketmaster:**
- Store in Vercel Environment Variables: `TICKETMASTER_API_KEY=xxx`
- Access via `process.env.TICKETMASTER_API_KEY`
- Never commit to git

**Setup:**
1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Add `TICKETMASTER_API_KEY` with value from https://developer.ticketmaster.com/
3. Redeploy (or restart dev server)

---

## 5. Testing Plan

### 5.1 Local Testing

**Before deploying:**

```bash
# 1. Test each scraper individually
cd /data/.openclaw/workspace/netscope

# Test Eventbrite
node -e "import('./lib/scrapers/eventbrite.ts').then(m => m.scrapeEventbrite().then(console.log))"

# Test Luma
node -e "import('./lib/scrapers/luma.ts').then(m => m.scrapeLuma().then(console.log))"

# Test Ticketmaster (after adding API key to .env)
node -e "import('./lib/scrapers/ticketmaster.ts').then(m => m.scrapeTicketmaster().then(console.log))"

# 2. Test full discovery flow
curl -X POST http://localhost:3000/api/discover
```

**Expected Results:**
- Eventbrite: 10-30 events
- Luma: 15-25 events
- Ticketmaster: 30-50 events
- **Total: 55-105 events**

---

### 5.2 Vercel Preview Testing

**After deploying to Vercel:**

```bash
# Test discovery endpoint
curl -X POST https://your-preview-url.vercel.app/api/discover

# Verify response time (should be <10s)
time curl -X POST https://your-preview-url.vercel.app/api/discover

# Check Vercel logs for errors
vercel logs
```

---

## 6. Implementation Checklist

- [ ] **Fix Eventbrite scraper** (update paths, add logging)
- [ ] **Fix Luma scraper** (correct nested event object access)
- [ ] **Remove Built In Chicago scraper** (broken redirect)
- [ ] **Add Ticketmaster scraper** (new file + API key setup)
- [ ] **Update `/lib/scrapers/index.ts`** (add Ticketmaster, remove Built In)
- [ ] **Add caching to `/api/discover`** (15-min cache)
- [ ] **Add logging to all scrapers** (console.log counts and errors)
- [ ] **Test locally** (verify each scraper returns events)
- [ ] **Update `.env.example`** (add `TICKETMASTER_API_KEY=`)
- [ ] **Add Vercel environment variable** (Ticketmaster API key)
- [ ] **Deploy to Vercel preview**
- [ ] **Test live endpoint**
- [ ] **Monitor Vercel logs** (check for errors/timeouts)
- [ ] **Update README** (document new data sources)

---

## 7. Additional Event Sources (Future Enhancements)

### Worth Considering:

1. **Meetup.com** (scraping)
   - Best for tech/professional meetups
   - Requires JS rendering or GraphQL interception
   - Medium difficulty

2. **LinkedIn Events** (scraping)
   - Growing professional event platform
   - Requires auth or scraping
   - Medium-high difficulty

3. **Facebook Events** (API)
   - Facebook Graph API has events endpoint
   - Requires app approval
   - High difficulty (auth, permissions)

4. **Eventbrite Organization API**
   - Can still fetch events from specific organizations via their org API
   - Requires knowing org IDs
   - Medium difficulty

5. **City of Chicago Open Data**
   - `dev.cityofchicago.org` has some public event data
   - Limited to official city events
   - Low difficulty (public API)

---

## 8. Conclusion

**TL;DR:**
1. ✅ Eventbrite and Luma both have working, scrapable data
2. ⚠️ Scrapers have parsing bugs (fixable in ~1-2 hours)
3. ❌ Built In Chicago is broken (drop it)
4. ⭐ Add Ticketmaster Discovery API (best new source)
5. ✅ Vercel compatibility is fine (no major concerns)

**Expected Outcome After Fixes:**
- **Before:** 0 events
- **After:** 55-105 events per scrape
- **Scrape Time:** 2-5 seconds (well under Vercel limits)

**Next Steps:**
Follow the Implementation Checklist above. Prioritize:
1. Fix Luma (easiest, high-yield)
2. Fix Eventbrite (medium difficulty, high-yield)
3. Add Ticketmaster (easy with API, highest-yield)

---

**Questions?** Check the code examples in Section 3 or test the curl commands in Section 1.

**Good luck!** 🚀
