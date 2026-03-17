import { Event } from '../types';
import * as cheerio from 'cheerio';

const EVENTBRITE_URLS = [
  'https://www.eventbrite.com/d/il--chicago/business--events/',
  'https://www.eventbrite.com/d/il--chicago/science-and-tech--events/',
  'https://www.eventbrite.com/d/il--chicago/networking/',
];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface EBParsedEvent {
  name: string;
  url: string;
  venue?: string;
  date?: string;
}

export async function scrapeEventbrite(): Promise<Event[]> {
  const allEvents: Event[] = [];
  const seenUrls = new Set<string>();

  for (const pageUrl of EVENTBRITE_URLS) {
    try {
      const response = await fetch(pageUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) {
        console.error(`Eventbrite page error: ${response.status} for ${pageUrl}`);
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Try to extract from JSON-LD structured data
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

      // Fallback: parse from inline JSON data
      const scriptContent = html.match(/window\.__SERVER_DATA__\s*=\s*({[\s\S]*?});?\s*<\/script>/);
      if (scriptContent) {
        try {
          const serverData = JSON.parse(scriptContent[1]);
          // Navigate the server data structure for events
          const searchResults = serverData?.search_data?.events?.results || [];
          for (const result of searchResults) {
            const url = result.url || `https://www.eventbrite.com/e/${result.id}`;
            if (seenUrls.has(url)) continue;
            seenUrls.add(url);

            allEvents.push({
              id: `eb-${result.id || Math.random().toString(36).slice(2, 12)}`,
              title: result.name || result.title || '',
              description: result.summary || result.description?.substring(0, 500) || '',
              start_date: result.start_date || result.start?.local || '',
              end_date: result.end_date || result.end?.local || '',
              location: result.primary_venue?.name || result.venue?.name || 'Chicago, IL',
              format: result.is_online_event ? 'virtual' : 'in-person',
              type: 'networking',
              topics: ['business', 'networking'],
              cost: result.is_free ? 'free' : 'paid',
              url,
              source: 'eventbrite',
              image_url: result.image?.url,
              status: 'active',
            });
          }
        } catch {}
      }

      // Fallback 2: regex extraction from raw HTML
      if (allEvents.length === 0) {
        const urlMatches = html.matchAll(/"url":"(https:\/\/www\.eventbrite\.com\/e\/[^"]+)"/g);
        const nameMatches = [...html.matchAll(/"name":"([^"]+)"/g)];
        
        const urls: string[] = [];
        for (const m of urlMatches) {
          if (!seenUrls.has(m[1])) {
            seenUrls.add(m[1]);
            urls.push(m[1]);
          }
        }
        
        // Names appear in pairs: venue name, then event name
        let nameIdx = 0;
        for (const url of urls) {
          // Skip venue names, get event names (usually every other one)
          const venueName = nameMatches[nameIdx]?.[1] || '';
          nameIdx++;
          const eventName = nameMatches[nameIdx]?.[1] || '';
          nameIdx++;
          
          if (eventName) {
            allEvents.push({
              id: `eb-${Buffer.from(url).toString('base64').slice(0, 20)}`,
              title: eventName.replace(/\\u0026/g, '&'),
              description: '',
              start_date: '',
              location: venueName.replace(/\\u0026/g, '&') || 'Chicago, IL',
              format: 'in-person',
              type: 'networking',
              topics: ['business', 'networking'],
              cost: 'paid',
              url,
              source: 'eventbrite',
              status: 'active',
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scraping Eventbrite page ${pageUrl}:`, error);
    }
  }

  console.log(`✅ Scraped ${allEvents.length} events from Eventbrite`);
  return allEvents;
}
