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
    // Ticketmaster is mostly entertainment — pull Arts/Theatre/Misc which 
    // occasionally includes conferences, speaking events, and cultural events
    // worth attending for networking. Don't filter by classification since
    // business events barely exist on TM.
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      city: 'Chicago',
      stateCode: 'IL',
      segmentName: 'Arts & Theatre,Miscellaneous',
      size: '30',
      sort: 'date,asc',
    });

    const response = await fetch(`${TICKETMASTER_BASE_URL}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    
    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const tmEvents = data._embedded?.events || [];

    for (const evt of tmEvents) {
      const venue = evt._embedded?.venues?.[0];
      const priceRange = evt.priceRanges?.[0];
      const classification = evt.classifications?.[0];
      const segment = classification?.segment?.name || '';
      const genre = classification?.genre?.name || '';
      
      events.push({
        id: `ticketmaster-${evt.id}`,
        title: evt.name,
        description: evt.description || evt.info || '',
        start_date: evt.dates?.start?.dateTime || evt.dates?.start?.localDate || '',
        end_date: evt.dates?.end?.dateTime || '',
        location: venue?.name || (venue?.city?.name ? `${venue.city.name}, ${venue.state?.stateCode}` : 'Chicago, IL'),
        format: 'in-person',
        type: inferEventType(segment, genre),
        topics: inferTopics(evt.name, evt.description || '', segment, genre),
        cost: priceRange?.min === 0 ? 'free' : 'paid',
        price: priceRange?.min,
        url: evt.url,
        source: 'ticketmaster',
        image_url: evt.images?.[0]?.url,
        status: 'active',
      });
    }

    console.log(`✅ Fetched ${events.length} events from Ticketmaster`);
  } catch (error) {
    console.error('Error fetching Ticketmaster:', error);
  }

  return events;
}

function inferEventType(segment: string, genre: string): Event['type'] {
  const s = segment.toLowerCase();
  const g = genre.toLowerCase();
  if (s.includes('conference') || g.includes('conference')) return 'conference';
  if (g.includes('seminar') || g.includes('lecture')) return 'seminar';
  if (g.includes('workshop')) return 'workshop';
  if (g.includes('theatre') || g.includes('comedy') || g.includes('performing')) return 'networking';
  return 'networking';
}

function inferTopics(name: string, description: string, segment: string, genre: string): string[] {
  const text = `${name} ${description} ${segment} ${genre}`.toLowerCase();
  const topics: string[] = [];
  
  if (text.includes('tech') || text.includes('software') || text.includes('ai') || text.includes('digital')) topics.push('tech');
  if (text.includes('business') || text.includes('entrepreneur') || text.includes('startup') || text.includes('leader')) topics.push('business');
  if (text.includes('network') || text.includes('mixer') || text.includes('social')) topics.push('networking');
  if (text.includes('art') || text.includes('theatre') || text.includes('culture')) topics.push('culture');
  
  return topics.length > 0 ? topics : ['culture'];
}
