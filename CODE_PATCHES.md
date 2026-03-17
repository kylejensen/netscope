# Exact Code Patches for NetScope Scrapers

Copy-paste these exact fixes into your scrapers.

---

## 1. Luma Scraper Fix

**File:** `/lib/scrapers/luma.ts`

**Replace the entire function with:**

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
        console.log('[Luma] ✅ Parsed __NEXT_DATA__');
        
        // FIXED PATH: props.pageProps.initialData.data.events
        const eventList = nextData?.props?.pageProps?.initialData?.data?.events || [];
        console.log(`[Luma] Found ${eventList.length} events`);
        
        for (const item of eventList) {
          // KEY FIX: Event data is nested in item.event!
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
            location: event.geo_address_info?.city_state || 
                     event.geo_address_info?.address || 
                     'Chicago, IL',
            // FIXED: Handle all location types
            format: event.location_type === 'online' ? 'virtual' : 
                   event.location_type === 'offline' ? 'in-person' : 'hybrid',
            type: inferEventType(event.name),
            topics: inferTopics(event.name, event.description || ''),
            cost: 'free',
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
      console.warn('[Luma] ❌ Could not find __NEXT_DATA__ in page');
    }

    console.log(`[Luma] ✅ Scraped ${events.length} events`);
  } catch (error) {
    console.error('[Luma] Error:', error);
  }

  return events;
}

// Keep existing inferEventType and inferTopics functions unchanged
```

---

## 2. Eventbrite Scraper Fix

**File:** `/lib/scrapers/eventbrite.ts`

**Replace lines 18-80 (the main scraping logic) with:**

```typescript
export async function scrapeEventbrite(): Promise<Event[]> {
  const allEvents: Event[] = [];
  const seenUrls = new Set<string>();

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
      const $ = cheerio.load(html);

      // METHOD 1: Extract window.__SERVER_DATA__ (FIXED REGEX)
      const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*({.+?});[\s\n]*<\/script>/s);
      
      if (serverDataMatch) {
        try {
          const serverData = JSON.parse(serverDataMatch[1]);
          console.log('[Eventbrite] ✅ Parsed __SERVER_DATA__');
          
          // Try multiple possible paths (structure varies by page)
          const events = serverData?.search_data?.events?.results || 
                        serverData?.events?.results ||
                        serverData?.feed?.events || [];
          
          console.log(`[Eventbrite] Found ${events.length} events in __SERVER_DATA__`);
          
          for (const result of events) {
            if (!result.name && !result.title) continue;
            
            const eventUrl = result.url || `https://www.eventbrite.com/e/${result.id}`;
            if (seenUrls.has(eventUrl)) continue;
            seenUrls.add(eventUrl);

            allEvents.push({
              id: `eb-${result.id || Math.random().toString(36).slice(2, 12)}`,
              title: result.name || result.title || '',
              description: result.summary || result.description?.substring(0, 500) || '',
              // FIXED: Handle multiple date field variations
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

      // METHOD 2: JSON-LD structured data (fallback)
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '');
          const items = Array.isArray(json) ? json : [json];
          
          for (const item of items) {
            if (item['@type'] === 'Event' && item.name && item.url) {
              if (seenUrls.has(item.url)) continue;
              seenUrls.add(item.url);

              allEvents.push({
                id: `eb-${Buffer.from(item.url).toString('base64').slice(0, 20)}`,
                title: item.name,
                description: item.description?.substring(0, 500) || '',
                start_date: item.startDate || '',
                end_date: item.endDate || '',
                location: item.location?.name || item.location?.address?.addressLocality || 'Chicago, IL',
                format: item.location?.['@type'] === 'VirtualLocation' ? 'virtual' : 'in-person',
                type: 'networking',
                topics: ['business', 'networking'],
                cost: item.offers?.price === 0 || item.isAccessibleForFree ? 'free' : 'paid',
                price: item.offers?.price,
                url: item.url,
                source: 'eventbrite',
                image_url: item.image,
                status: 'active',
              });
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

---

## 3. Remove Built In Chicago

**File:** `/lib/scrapers/index.ts`

**Remove these lines:**

```typescript
// DELETE THIS IMPORT:
import { scrapeBuiltInChicago } from './builtin-chicago';

// DELETE THIS FROM Promise.allSettled:
scrapeBuiltInChicago(),
```

**Then delete the file:**
```bash
rm lib/scrapers/builtin-chicago.ts
```

---

## 4. Add Ticketmaster (Optional but Recommended)

**Create new file:** `/lib/scrapers/ticketmaster.ts`

```typescript
import { Event } from '../types';

const TICKETMASTER_API_BASE = 'https://app.ticketmaster.com/discovery/v2';

export async function scrapeTicketmaster(): Promise<Event[]> {
  const API_KEY = process.env.TICKETMASTER_API_KEY;
  
  if (!API_KEY) {
    console.warn('[Ticketmaster] API key not configured, skipping');
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
        format: 'in-person',
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

**Update `/lib/scrapers/index.ts`:**

```typescript
import { scrapeTicketmaster } from './ticketmaster';

export async function scrapeAllEvents(): Promise<Event[]> {
  console.log('🔍 Starting event discovery from all sources...');

  const results = await Promise.allSettled([
    scrapeEventbrite(),
    scrapeLuma(),
    scrapeTicketmaster(), // ADD THIS
  ]);

  // ... rest unchanged
}
```

**Add to `.env`:**
```
TICKETMASTER_API_KEY=your_api_key_here
```

---

## Summary of Changes

✅ **Luma:** Fixed path to events and nested event object access  
✅ **Eventbrite:** Fixed regex and date field handling  
❌ **Built In:** Removed (broken redirect)  
⭐ **Ticketmaster:** Added (optional, 30-50 more events)

**Expected Result:** 55-105 total events (up from 0)

---

## Test Commands

```bash
# Start dev server
npm run dev

# Test discovery endpoint
curl -X POST http://localhost:3000/api/discover

# Should see JSON with events array
```

If you see `"count": 55` or higher → SUCCESS! 🎉

---

## Deployment to Vercel

1. Commit changes:
   ```bash
   git add .
   git commit -m "Fix event scrapers: Luma, Eventbrite, add Ticketmaster"
   git push
   ```

2. In Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add `TICKETMASTER_API_KEY` = your key
   - Redeploy

3. Test live:
   ```bash
   curl -X POST https://your-app.vercel.app/api/discover
   ```
