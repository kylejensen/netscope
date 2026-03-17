import { Event } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeLuma(): Promise<Event[]> {
  const events: Event[] = [];

  try {
    // Verified working endpoint: GET https://api.lu.ma/discover/get-paginated-events
    const params = new URLSearchParams({
      geo_latitude: '41.8781',
      geo_longitude: '-87.6298',
    });

    const response = await fetch(`https://api.lu.ma/discover/get-paginated-events?${params}`, {
      headers: {
        'x-luma-client-id': 'luma-web',
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`Luma API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const entries = data?.entries || [];

    for (const entry of entries) {
      const event = entry.event;
      if (!event?.name) continue;

      const slug = event.url || event.api_id || '';
      const fullUrl = slug.startsWith('http') ? slug : `https://lu.ma/${slug}`;
      
      // Parse ticket info
      const ticketInfo = entry.ticket_info;
      const isFree = ticketInfo?.is_free === true;
      const price = ticketInfo?.price?.cents ? ticketInfo.price.cents / 100 : undefined;

      // Parse location
      const geoInfo = event.geo_address_info;
      const location = geoInfo?.city_state || geoInfo?.city || 'Chicago, IL';

      events.push({
        id: `luma-${event.api_id || slug}`,
        title: event.name,
        description: entry.calendar?.description_short?.substring(0, 500) || '',
        start_date: event.start_at || entry.start_at || '',
        end_date: event.end_at || '',
        location,
        format: event.location_type === 'online' ? 'virtual' : 'in-person',
        type: inferEventType(event.name),
        topics: inferTopics(event.name, entry.calendar?.description_short || ''),
        cost: isFree ? 'free' : 'paid',
        price,
        url: fullUrl,
        source: 'luma',
        image_url: event.cover_url,
        status: 'active',
      });
    }

    console.log(`✅ Fetched ${events.length} events from Luma`);
  } catch (error) {
    console.error('Error fetching Luma:', error);
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
  if (lower.includes('pitch') || lower.includes('demo')) return 'conference';
  if (lower.includes('mixer') || lower.includes('happy hour') || lower.includes('networking') || lower.includes('social')) return 'networking';
  if (lower.includes('dinner') || lower.includes('coffee')) return 'networking';
  return 'networking';
}

function inferTopics(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const topics: string[] = [];
  if (text.includes('tech') || text.includes('software') || text.includes('ai') || text.includes('developer') || text.includes('code') || text.includes('engineer')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup') || text.includes('venture') || text.includes('founder')) topics.push('business');
  if (text.includes('network') || text.includes('mixer') || text.includes('connect') || text.includes('social') || text.includes('dinner') || text.includes('coffee')) topics.push('networking');
  if (text.includes('leader') || text.includes('management') || text.includes('executive') || text.includes('women')) topics.push('leadership');
  if (text.includes('saas') || text.includes('product')) topics.push('saas');
  if (text.includes('web3') || text.includes('crypto') || text.includes('blockchain')) topics.push('web3');
  if (topics.length === 0) topics.push('networking');
  return topics;
}
