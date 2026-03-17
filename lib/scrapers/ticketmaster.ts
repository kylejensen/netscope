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

    const response = await fetch(`${TICKETMASTER_BASE_URL}?${params}`, {
      signal: AbortSignal.timeout(8000), // 8s timeout guard
    });
    
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
