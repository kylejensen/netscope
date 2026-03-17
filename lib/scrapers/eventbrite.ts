import { Event } from '../types';

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY || '';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description?: { text?: string };
  start: { local: string };
  end: { local: string };
  venue?: {
    address?: { city?: string; region?: string; localized_address_display?: string };
  };
  online_event: boolean;
  is_free: boolean;
  url: string;
  logo?: { url?: string };
  category?: { name?: string };
}

export async function scrapeEventbrite(): Promise<Event[]> {
  if (!EVENTBRITE_API_KEY) {
    console.warn('EVENTBRITE_API_KEY not configured');
    return [];
  }

  try {
    // Search for events in Chicago
    // Eventbrite API v3 categories: Business & Professional (101), Science & Technology (102), etc.
    const searchParams = new URLSearchParams({
      'location.address': 'Chicago, IL',
      'location.within': '25mi',
      'categories': '101,102,110', // Business, Tech, Networking
      'expand': 'venue,category',
      'sort_by': 'date',
    });

    const response = await fetch(
      `${EVENTBRITE_API_BASE}/events/search/?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Eventbrite API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const events: Event[] = [];

    for (const eb of (data.events || []) as EventbriteEvent[]) {
      const location = eb.venue?.address?.localized_address_display ||
        (eb.venue?.address?.city && eb.venue?.address?.region
          ? `${eb.venue.address.city}, ${eb.venue.address.region}`
          : 'Chicago, IL');

      const format = eb.online_event ? 'virtual' : 'in-person';
      
      // Infer type from category
      let type: Event['type'] = 'networking';
      const catName = eb.category?.name?.toLowerCase() || '';
      if (catName.includes('conference')) type = 'conference';
      else if (catName.includes('seminar')) type = 'seminar';
      else if (catName.includes('workshop')) type = 'workshop';
      else if (catName.includes('meetup')) type = 'meetup';

      events.push({
        id: `eventbrite-${eb.id}`,
        title: eb.name.text,
        description: eb.description?.text?.substring(0, 500) || '',
        start_date: eb.start.local,
        end_date: eb.end.local,
        location,
        format,
        type,
        topics: ['business', 'tech', 'networking'],
        cost: eb.is_free ? 'free' : 'paid',
        url: eb.url,
        source: 'eventbrite',
        image_url: eb.logo?.url,
        status: 'active',
      });
    }

    console.log(`✅ Scraped ${events.length} events from Eventbrite`);
    return events;
  } catch (error) {
    console.error('Error scraping Eventbrite:', error);
    return [];
  }
}
