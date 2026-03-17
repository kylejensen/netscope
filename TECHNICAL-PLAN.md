# NetScope Event Discovery - Technical Audit & Recovery Plan

**Date:** March 16, 2026  
**Status:** In Progress  
**Problem:** All three scrapers returning 0 events

---

## Executive Summary

NetScope's event discovery system relies on web scraping for three sources: Eventbrite, Luma, and Built In Chicago. All three scrapers are currently failing to return events. Initial investigation reveals fundamental issues with each approach.

---

## Source-by-Source Analysis

### 1. Eventbrite (`lib/scrapers/eventbrite.ts`)

**Current Approach:**
- Scrapes browse pages: `/d/il--chicago/business--events/`, `/science-and-tech--events/`, `/networking/`
- Multi-layer extraction strategy:
  1. JSON-LD structured data (`<script type="application/ld+json">`)
  2. `window.__SERVER_DATA__` inline JavaScript variable
  3. Regex fallback for URL/name extraction

**Test Results:**
- ✅ Pages are accessible (HTTP 200)
- ✅ URL now redirects to `/b/il--chicago/business/` (structure changed)
- ✅ **Events ARE present** in the HTML response
- ❌ But scraper is failing to extract them

**Visible Events in Response:**
```
- 2026 BUSINESS & LEADERSHIP CONFERENCE (BLC)
- Government Contracting Summit hosted by The Illinois APEX Accelerator
- 2025 Sales Awards
- Sustainability LIVE: The US Summit
- Chicago Tech Mixer 2026
- And more...
```

**Root Cause:**
1. **URL structure changed** - Eventbrite changed from `/d/` to `/b/` paths
2. **HTML structure likely changed** - JSON-LD/SERVER_DATA extraction methods may be outdated
3. **Cheerio parsing issue** - Server-side `fetch()` gets raw HTML, but event data may be in embedded JSON that needs different parsing

**Action Items:**
- Update URLs to new `/b/` structure
- Inspect actual HTML structure with raw fetch to see where event data lives
- Test if `window.__SERVER_DATA__` still exists or if Eventbrite moved to a different data format
- Consider alternative: Eventbrite has an undocumented GraphQL endpoint that might be more stable

---

### 2. Luma (`lib/scrapers/luma.ts`)

**Current Approach:**
- Scrapes `https://lu.ma/chicago`
- Extracts from Next.js `__NEXT_DATA__` script tag
- Fallback: regex extraction from JSON fragments in HTML

**Test Results:**
- ✅ Page is accessible (HTTP 200, redirects to `luma.com/chicago`)
- ✅ **Many events ARE visible** in the response
- ❌ But scraper is failing to extract them

**Visible Events in Response:**
```
- Together Hospitality Chicago Roundtable @ Babe's Sports Bar
- Small Business Development Centers (SBDC) Day Breakfast & Business Spotlight
- PCC Presents: Crisis in a Fragmented Media World
- The AI Reality Check: What Actually Delivers in Healthcare
- Chicago | Claude Code for HealthTech
- Chicago Grassroots Tech Community Meetup - March
- And 14+ more...
```

**Root Cause:**
1. **Next.js data structure changed** - The `__NEXT_DATA__` parsing path (`pageProps.initialData.featured_items`) may be stale
2. **Client-side rendering** - Luma likely renders most event data client-side via React, so raw HTML fetch won't include full event details
3. **Dynamic content** - Events are loaded via API calls after page load, not in initial SSR payload

**Action Items:**
- Inspect raw HTML to confirm `__NEXT_DATA__` structure
- Check Luma's network requests for API endpoints (likely `/api/calendar/*` or similar)
- Consider using Luma's public API if available, or reverse-engineer their internal API
- web_fetch with readability extractor shows event names but not structured data - need raw HTML analysis

---

### 3. Built In Chicago (`lib/scrapers/builtin-chicago.ts`)

**Current Approach:**
- Scrapes `https://www.builtinchicago.org/events`
- Uses Cheerio to parse event cards: `.event-card`, `.event-item`, `article[data-type="event"]`
- Also looks for JSON-LD structured data

**Test Results:**
- ❌ **Domain has redirect loop / misconfiguration**
- Redirect header: `location: https://www.builtinchicago.orghttps//www.builtinchicago.org` (malformed)
- Alternative domain `builtin.com/events` exists but returns minimal content (SPA with no SSR)
- `builtin.com/chicago/events` returns 404

**Root Cause:**
1. **Built In Chicago subdomain is broken** - Redirect loop makes it inaccessible
2. **Built In consolidated sites** - Likely moved to unified `builtin.com` domain with SPA architecture
3. **No SSR content** - Built In is now a full SPA with client-side rendering; traditional scraping won't work
4. **No public events API** - Built In doesn't expose event data in a scrapeable format

**Action Items:**
- Confirm if Built In Chicago still exists or has been deprecated
- Check if `builtin.com` has a Chicago-specific events page or filter
- Investigate if Built In has a hidden API endpoint for events (check network tab in browser)
- **LIKELY OUTCOME:** This source should be **deprecated** and replaced

---

## Vercel Serverless Constraints

**Critical Context:**
- Hobby plan: **10-second timeout** (hard limit)
- Pro plan: **60-second timeout** (configurable up to 900s on enterprise)
- Current scrapers run in parallel via `Promise.allSettled()` ✅
- Each scraper makes 1-3 HTTP requests

**Timing Estimates:**
- Eventbrite: ~2-3 seconds per page (3 pages = 6-9s total)
- Luma: ~1 second
- Built In: N/A (broken)
- **Total parallel execution: ~6-10 seconds** (within hobby limits if working)

**Risk:**
- If scrapers need to make multiple sequential requests or wait for client-side rendering, we'll hit timeout limits
- May need to implement webhook-based background jobs or use Vercel Cron for scheduled scraping instead of on-demand

---

---

## Root Cause Summary

### Critical Finding: All Three Sources Are Now Client-Side SPAs

**The fundamental problem:** All three scrapers use server-side `fetch()` to retrieve HTML, but Eventbrite, Luma, and Built In Chicago are now **single-page applications (SPAs)** that render event data client-side via JavaScript. The initial HTML response contains minimal data—events are loaded after the page renders.

**Browser automation test results:**
- ✅ Eventbrite: Events render properly (tested: 8+ events visible with full details)
- ✅ Luma: Events render properly (tested: 20+ events visible with full details)
- ❌ Built In Chicago: Domain has redirect loop, effectively broken

**Impact:** Simple `fetch()` + Cheerio parsing will **never work** for these sources in their current architecture.

---

## Alternative Event Discovery APIs (2026)

### ✅ Recommended: Ticketmaster Discovery API
- **Status:** Active, free tier available
- **Access:** Public API with instant API key upon registration
- **Endpoint:** `https://app.ticketmaster.com/discovery/v2/events.json`
- **Query params:** `city`, `stateCode`, `classificationName`, `keyword`, `startDateTime`, `size`
- **Coverage:** Large commercial events (concerts, sports, conferences)
- **Rate limit:** ~5,000 requests/day on free tier
- **Pros:** Structured JSON, reliable, no scraping needed
- **Cons:** Biased toward ticketed/commercial events; misses grassroots/free events
- **Docs:** https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

### ✅ Recommended: Meetup.com GraphQL API
- **Status:** Active, requires OAuth
- **Access:** Public API, requires API key
- **Endpoint:** `https://api.meetup.com/gql`
- **Query:** GraphQL `keywordSearch` with `lat`/`lon`/`radius` filters
- **Coverage:** Community meetups, tech events, networking
- **Rate limit:** Varies by API plan
- **Pros:** Excellent for grassroots/community events, free events
- **Cons:** Requires OAuth flow, more complex integration
- **Docs:** https://www.meetup.com/meetup_api/

### ⚠️ Not Recommended: Eventbrite API
- **Status:** Search API deprecated (2019)
- **Access:** API exists but **no public event discovery endpoint**
- **Quote:** *"As of August 2024, there is no public API endpoint for searching events across the entire Eventbrite platform."* (rollout.com)
- **Current API:** Only supports managing YOUR OWN events (not discovery)
- **Verdict:** **Must scrape or use browser automation**

### ⚠️ Not Recommended: SeatGeek API
- **Status:** Active but restricted
- **Coverage:** Primarily ticketed entertainment (concerts, sports)
- **Access:** API key required, rate limits unclear
- **Docs:** https://platform.seatgeek.com/

---

## Recommended Solution: Hybrid Approach

### Option A: Replace Scrapers with APIs (Preferred)

**Phase 1: Immediate Wins**
1. **Add Ticketmaster Discovery API** (1-2 hours)
   - Free tier, instant API key
   - Provides large ticketed events (conferences, seminars, workshops)
   - Simple REST API, easy to integrate

2. **Add Meetup.com GraphQL API** (2-4 hours)
   - Best for grassroots/community tech events
   - Requires OAuth setup (one-time config)
   - Complements Ticketmaster's commercial focus

**Phase 2: Keep Working Scrapers**
3. **Fix Luma scraper** (see detailed fix below)
   - Luma is accessible and has discoverable structure
   - Can be fixed with better parsing or light browser automation

4. **Deprecate Eventbrite & Built In** (0 hours)
   - Eventbrite: No public API, scraping unreliable
   - Built In: Broken domain, SPA architecture
   - Not worth the maintenance cost

**Result:** 2 reliable APIs + 1 fixed scraper = 3 working sources

### Option B: Browser Automation (Higher Effort)

Use Playwright/Puppeteer to render JavaScript and scrape:
- **Pros:** Works for all three sources
- **Cons:** 
  - Slower (3-5s per source)
  - Serverless timeout risk on Hobby plan (10s limit)
  - More fragile (UI changes break scrapers)
  - Requires headless browser in Vercel deployment

**Verdict:** Not recommended for Vercel serverless unless on Pro plan with extended timeouts.

---

## Code-Level Fix Recommendations

### 1. Ticketmaster Discovery API Integration

**New file:** `lib/scrapers/ticketmaster.ts`

```typescript
import { Event } from '../types';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

export async function scrapeTicketmaster(): Promise<Event[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn('⚠️  Ticketmaster API key not configured');
    return [];
  }

  const events: Event[] = [];
  
  try {
    // Query params for Chicago business/tech events
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      city: 'Chicago',
      stateCode: 'IL',
      classificationName: 'Business,Technology,Conference', // Category filter
      size: '50', // Max results per page
      sort: 'date,asc',
    });

    const response = await fetch(`${TICKETMASTER_BASE_URL}?${params}`);
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const tmEvents = data._embedded?.events || [];

    for (const evt of tmEvents) {
      // Map Ticketmaster data to Event type
      const venue = evt._embedded?.venues?.[0];
      const priceRange = evt.priceRanges?.[0];
      
      events.push({
        id: `ticketmaster-${evt.id}`,
        title: evt.name,
        description: evt.description || evt.info || '',
        start_date: evt.dates?.start?.dateTime || evt.dates?.start?.localDate,
        end_date: evt.dates?.end?.dateTime || '',
        location: venue?.name || `${venue?.city?.name}, ${venue?.state?.stateCode}` || 'Chicago, IL',
        format: evt.dates?.start?.noSpecificTime ? 'virtual' : 'in-person',
        type: inferEventType(evt.classifications?.[0]),
        topics: inferTopics(evt.name, evt.description || ''),
        cost: priceRange?.min === 0 ? 'free' : 'paid',
        price: priceRange?.min,
        url: evt.url,
        source: 'ticketmaster',
        image_url: evt.images?.[0]?.url,
        status: 'active',
      });
    }

    console.log(`✅ Scraped ${events.length} events from Ticketmaster`);
  } catch (error) {
    console.error('Error scraping Ticketmaster:', error);
  }

  return events;
}

function inferEventType(classification: any): Event['type'] {
  const segment = classification?.segment?.name?.toLowerCase() || '';
  const genre = classification?.genre?.name?.toLowerCase() || '';
  
  if (segment.includes('conference') || genre.includes('conference')) return 'conference';
  if (segment.includes('seminar') || genre.includes('seminar')) return 'seminar';
  if (genre.includes('networking')) return 'networking';
  if (segment.includes('workshop')) return 'workshop';
  return 'conference';
}

function inferTopics(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const topics: string[] = [];
  
  if (text.includes('tech') || text.includes('software') || text.includes('ai')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup')) topics.push('business');
  if (text.includes('leader') || text.includes('executive')) topics.push('leadership');
  if (text.includes('saas') || text.includes('product')) topics.push('saas');
  
  return topics.length > 0 ? topics : ['business'];
}
```

**Environment variable:**
```bash
TICKETMASTER_API_KEY=your_api_key_here
```

**Add to Vercel:**
```bash
vercel env add TICKETMASTER_API_KEY
```

---

### 2. Meetup.com GraphQL API Integration

**New file:** `lib/scrapers/meetup.ts`

```typescript
import { Event } from '../types';

const MEETUP_OAUTH_TOKEN = process.env.MEETUP_OAUTH_TOKEN || '';
const MEETUP_GRAPHQL_URL = 'https://api.meetup.com/gql';

// Chicago coordinates
const CHICAGO_LAT = 41.8781;
const CHICAGO_LON = -87.6298;
const SEARCH_RADIUS_MILES = 25;

export async function scrapeMeetup(): Promise<Event[]> {
  if (!MEETUP_OAUTH_TOKEN) {
    console.warn('⚠️  Meetup OAuth token not configured');
    return [];
  }

  const events: Event[] = [];

  try {
    const query = `
      query ($filter: KeywordSearchFilterInput!) {
        keywordSearch(filter: $filter) {
          count
          edges {
            node {
              result {
                ... on Event {
                  id
                  title
                  description
                  eventUrl
                  dateTime
                  endTime
                  timezone
                  going
                  venue {
                    name
                    address
                    city
                    state
                  }
                  group {
                    name
                  }
                  featuredPhoto {
                    baseUrl
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      filter: {
        query: 'tech business startup networking',
        lat: CHICAGO_LAT,
        lon: CHICAGO_LON,
        radius: SEARCH_RADIUS_MILES,
        source: 'EVENTS',
      },
    };

    const response = await fetch(MEETUP_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MEETUP_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      console.error(`Meetup API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const edges = data?.data?.keywordSearch?.edges || [];

    for (const edge of edges) {
      const evt = edge.node?.result;
      if (!evt || !evt.title) continue;

      events.push({
        id: `meetup-${evt.id}`,
        title: evt.title,
        description: evt.description?.substring(0, 500) || '',
        start_date: evt.dateTime,
        end_date: evt.endTime || '',
        location: evt.venue?.name || `${evt.venue?.city}, ${evt.venue?.state}` || 'Chicago, IL',
        format: evt.venue ? 'in-person' : 'virtual',
        type: 'meetup',
        topics: inferTopics(evt.title, evt.description || ''),
        cost: 'free', // Most Meetups are free
        url: evt.eventUrl,
        source: 'meetup',
        image_url: evt.featuredPhoto?.baseUrl,
        status: 'active',
      });
    }

    console.log(`✅ Scraped ${events.length} events from Meetup`);
  } catch (error) {
    console.error('Error scraping Meetup:', error);
  }

  return events;
}

function inferTopics(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const topics: string[] = [];
  
  if (text.includes('tech') || text.includes('software') || text.includes('developer')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup')) topics.push('business');
  if (text.includes('network')) topics.push('networking');
  if (text.includes('ai') || text.includes('machine learning')) topics.push('tech');
  
  return topics.length > 0 ? topics : ['networking'];
}
```

**OAuth Setup:**
1. Go to https://www.meetup.com/api/oauth/authorize
2. Create OAuth application
3. Get access token
4. Add to Vercel: `MEETUP_OAUTH_TOKEN=your_token_here`

---

### 3. Fix Luma Scraper (Lightweight Option)

**Problem:** `__NEXT_DATA__` structure changed or is missing events.

**Solution:** Use regex extraction from visible HTML (fallback is already in code, but may need refinement).

**Improved approach:**

```typescript
// Add after existing Luma scraper code

// Alternative: Try fetching from Luma's calendar API directly
// Luma exposes an undocumented calendar endpoint
const calendarUrl = 'https://api.lu.ma/discover/get-calendar-events';
const calendarResponse = await fetch(calendarUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  },
  body: JSON.stringify({
    calendar_api_id: 'chicago', // Matches /chicago page
    period: 'future',
    pagination_cursor: null,
    pagination_limit: 50,
  }),
});

if (calendarResponse.ok) {
  const calendarData = await calendarResponse.json();
  const apiEvents = calendarData?.entries || [];
  
  for (const entry of apiEvents) {
    const event = entry.event;
    if (!event?.name) continue;
    
    // Map to Event type...
  }
}
```

**Note:** This endpoint may not be officially supported and could break. Monitor closely.

---

### 4. Deprecate Broken Scrapers

**File changes:**

`lib/scrapers/index.ts`:
```typescript
import { scrapeTicketmaster } from './ticketmaster';
import { scrapeMeetup } from './meetup';
import { scrapeLuma } from './luma';

export async function scrapeAllEvents(): Promise<Event[]> {
  console.log('🔍 Starting event discovery from all sources...');

  const results = await Promise.allSettled([
    scrapeTicketmaster(),
    scrapeMeetup(),
    scrapeLuma(), // Keep if fixed, otherwise remove
  ]);

  // Remove: scrapeEventbrite() — deprecated
  // Remove: scrapeBuiltInChicago() — broken

  // ... rest of deduplication logic
}
```

---

## Additional Event Sources Worth Adding

### High Priority
1. **Eventbrite** (via browser automation only)
   - Still has high-quality events
   - Requires Playwright/Puppeteer
   - Consider only if moving to Pro plan or external scraping service

2. **LinkedIn Events**
   - Professional networking events
   - No public API; would require scraping
   - High value for professional audience

### Medium Priority
3. **Facebook Events** (via scraping)
   - Huge event catalog
   - No public API (deprecated 2018)
   - Would require browser automation or unofficial APIs

4. **Partiful**
   - Rising platform for social/networking events
   - No public API yet
   - Worth monitoring

5. **Eventbee / Universe**
   - Alternative ticketing platforms
   - Check if they have public APIs

### Low Priority
6. **Allevents.in**
   - Event aggregator
   - Unknown API availability

7. **10times.com**
   - Conference/trade show focused
   - May have API

---

## Vercel Deployment Notes

### Current Constraints
- **Hobby Plan:** 10-second timeout per function
- **Pro Plan:** 60-second timeout (300s on Enterprise)
- **Recommendation:** Hobby plan is fine for API-based approach

### Serverless Execution Time Estimates
- Ticketmaster API call: ~500-1000ms
- Meetup API call: ~800-1200ms
- Luma scraper (if fixed): ~500-1000ms
- **Total:** ~2-3 seconds (well within 10s limit)

### If Browser Automation Is Required
- Use **Vercel Cron** to run scraping in background
- Store results in Vercel KV or external database
- API routes read from cache, not real-time scraping
- Update cache every 1-6 hours

**Cron setup:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/discover",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Handling Timeouts
- Set `maxDuration: 10` in route config
- Wrap scrapers in timeout guards:
```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 8000)
);

const result = await Promise.race([
  scrapeTicketmaster(),
  timeoutPromise,
]);
```

---

## Migration Plan

### Week 1: API Integration
- [ ] Sign up for Ticketmaster API key
- [ ] Implement Ticketmaster scraper
- [ ] Test with live data
- [ ] Deploy to Vercel dev environment

### Week 2: Meetup + Cleanup
- [ ] Set up Meetup OAuth
- [ ] Implement Meetup scraper
- [ ] Remove Eventbrite + Built In scrapers
- [ ] Update frontend to show new sources

### Week 3: Polish + Monitor
- [ ] Test Luma scraper reliability
- [ ] Add error alerting (Sentry, Vercel logs)
- [ ] Document API rate limits
- [ ] Set up cron job if needed

---

## Testing Checklist

Before deploying:
- [ ] Test each scraper individually
- [ ] Verify deduplication works with new sources
- [ ] Check all Event type fields are populated correctly
- [ ] Test on Vercel dev environment
- [ ] Monitor execution time (should be <5s total)
- [ ] Test with missing API keys (should gracefully skip)
- [ ] Verify no crashes from malformed responses

---

## Success Metrics

**Current State:** 0 events discovered  
**Target State:** 50-150 events per discovery run

**Expected Sources:**
- Ticketmaster: 20-40 events (business/tech categories)
- Meetup: 30-80 events (community meetups)
- Luma: 10-30 events (if fixed)

**Monitoring:**
- Track success rate per source
- Log API errors
- Alert if discovery returns <10 events (indicates failure)

---

## Conclusion

**Root Cause:** All scrapers relied on server-side HTML that no longer contains event data (SPAs).

**Solution:** Replace scraping with APIs where possible. Ticketmaster + Meetup provide better coverage, reliability, and speed than fragile web scrapers.

**Effort:** ~2-3 days for full migration to API-first approach.

**Outcome:** Reliable, fast, maintainable event discovery within Vercel serverless constraints.

---

**Plan Status:** ✅ Complete  
**Ready for Implementation:** Yes  
**Next Step:** Create Ticketmaster API scraper
