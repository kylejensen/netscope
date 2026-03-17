import { Event } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeLuma(): Promise<Event[]> {
  const events: Event[] = [];

  try {
    // First, try Luma's undocumented calendar API
    try {
      const calendarUrl = 'https://api.lu.ma/discover/get-calendar-events';
      const calendarResponse = await fetch(calendarUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
          calendar_api_id: 'chicago',
          period: 'future',
          pagination_cursor: null,
          pagination_limit: 50,
        }),
        signal: AbortSignal.timeout(8000), // 8s timeout guard
      });

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        const apiEvents = calendarData?.entries || [];
        
        for (const entry of apiEvents) {
          const event = entry.event;
          if (!event?.name) continue;

          const slug = event.url || event.api_id || '';
          const fullUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;

          events.push({
            id: `luma-${event.api_id || slug || Math.random().toString(36).slice(2, 12)}`,
            title: event.name,
            description: event.description?.substring(0, 500) || '',
            start_date: event.start_at || '',
            end_date: event.end_at || '',
            location: event.geo_address_info?.city_state || event.location || 'Chicago, IL',
            format: event.meeting_url ? 'virtual' : 'in-person',
            type: inferEventType(event.name),
            topics: inferTopics(event.name, event.description || ''),
            cost: 'free',
            url: fullUrl,
            source: 'luma',
            image_url: event.cover_url,
            status: 'active',
          });
        }

        if (events.length > 0) {
          console.log(`✅ Scraped ${events.length} events from Luma (API)`);
          return events;
        }
      }
    } catch (apiError) {
      console.warn('Luma API approach failed, falling back to HTML scraping:', apiError);
    }

    // Fallback: scrape the HTML page
    const response = await fetch('https://lu.ma/chicago', {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000), // 8s timeout guard
    });

    if (!response.ok) {
      console.error('Luma page error:', response.status);
      return [];
    }

    const html = await response.text();

    // Luma embeds event data as JSON in the page
    // Extract event objects from the inline data
    const eventPattern = /"name":"([^"]+)"[\s\S]*?"start_at":"([^"]+)"[\s\S]*?"url":"([^"]+)"/g;
    
    // Better approach: find the JSON data blob
    const scriptMatches = html.matchAll(/<script[^>]*>([^<]*(?:start_at|event)[^<]*)<\/script>/gi);
    
    // Parse from the raw HTML JSON fragments
    // Luma puts event data in Next.js __NEXT_DATA__ or inline scripts
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        
        // Navigate to find events in the data structure
        const initialData = pageProps?.initialData || pageProps;
        const eventList = initialData?.featured_items || initialData?.events || [];
        
        for (const item of eventList) {
          const event = item.event || item;
          if (!event.name) continue;

          const slug = event.url || item.url || '';
          const fullUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;

          events.push({
            id: `luma-${slug || Math.random().toString(36).slice(2, 12)}`,
            title: event.name,
            description: event.description?.substring(0, 500) || '',
            start_date: event.start_at || '',
            end_date: event.end_at || '',
            location: event.geo_address_info?.city_state || event.location || 'Chicago, IL',
            format: event.meeting_url ? 'virtual' : 'in-person',
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
        console.error('Error parsing Luma NEXT_DATA:', e);
      }
    }

    // Fallback: regex extraction
    if (events.length === 0) {
      const seenNames = new Set<string>();
      const fragments = html.matchAll(/"name":"((?:[^"\\]|\\.)*)"\s*[\s\S]*?"start_at":"([^"]*)"[\s\S]*?"url":"([^"]*)"/g);
      
      for (const match of fragments) {
        const name = match[1].replace(/\\u[\dA-Fa-f]{4}/g, (m) => 
          String.fromCharCode(parseInt(m.slice(2), 16))
        );
        
        // Skip city names, org names that aren't events
        if (name === 'Chicago' || name.length < 10 || seenNames.has(name)) continue;
        seenNames.add(name);

        const startAt = match[2];
        const slug = match[3];
        
        // Only include if it has a reasonable start date
        if (!startAt || !startAt.includes('T')) continue;

        const fullUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;

        events.push({
          id: `luma-${slug || Math.random().toString(36).slice(2, 12)}`,
          title: name,
          description: '',
          start_date: startAt,
          location: 'Chicago, IL',
          format: 'in-person',
          type: inferEventType(name),
          topics: inferTopics(name, ''),
          cost: 'free',
          url: fullUrl,
          source: 'luma',
          status: 'active',
        });
      }
    }

    console.log(`✅ Scraped ${events.length} events from Luma`);
  } catch (error) {
    console.error('Error scraping Luma:', error);
  }

  return events;
}

function inferEventType(name: string): Event['type'] {
  const lower = name.toLowerCase();
  if (lower.includes('conference') || lower.includes('summit')) return 'conference';
  if (lower.includes('workshop')) return 'workshop';
  if (lower.includes('webinar')) return 'webinar';
  if (lower.includes('meetup') || lower.includes('meet up')) return 'meetup';
  if (lower.includes('seminar')) return 'seminar';
  if (lower.includes('mixer') || lower.includes('happy hour') || lower.includes('networking')) return 'networking';
  return 'networking';
}

function inferTopics(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const topics: string[] = [];
  if (text.includes('tech') || text.includes('software') || text.includes('ai') || text.includes('developer')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup')) topics.push('business');
  if (text.includes('network') || text.includes('mixer') || text.includes('connect')) topics.push('networking');
  if (text.includes('leader') || text.includes('management') || text.includes('executive')) topics.push('leadership');
  if (text.includes('saas') || text.includes('product')) topics.push('saas');
  if (topics.length === 0) topics.push('networking');
  return topics;
}
