import * as cheerio from 'cheerio';
import { Event } from '../types';

export async function scrapeBuiltInChicago(): Promise<Event[]> {
  try {
    const response = await fetch('https://www.builtinchicago.org/events', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.warn('Built In Chicago fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: Event[] = [];

    // Built In uses event cards with structured data
    $('.event-card, .event-item, article[data-type="event"]').each((i, elem) => {
      const $card = $(elem);
      const title = $card.find('h2, h3, .event-title, .title').first().text().trim();
      const description = $card.find('.description, .event-description, p').first().text().trim();
      const dateText = $card.find('.date, .event-date, time').first().text().trim();
      const location = $card.find('.location, .venue, .event-location').first().text().trim() || 'Chicago, IL';
      const url = $card.find('a').first().attr('href');

      if (title && dateText) {
        const format = location.toLowerCase().includes('virtual') || location.toLowerCase().includes('online') ? 'virtual' : 'in-person';
        
        events.push({
          id: `builtin-${Math.random().toString(36).substr(2, 9)}`,
          title,
          description: description.substring(0, 500),
          start_date: new Date(dateText).toISOString(),
          location,
          format,
          type: 'meetup',
          topics: ['tech', 'professional'],
          cost: 'free',
          url: url?.startsWith('http') ? url : `https://www.builtinchicago.org${url || ''}`,
          source: 'builtin-chicago',
          status: 'active',
        });
      }
    });

    // Also try JSON-LD structured data
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html() || '{}');
        if (data['@type'] === 'Event' || (Array.isArray(data) && data.some((d: any) => d['@type'] === 'Event'))) {
          const eventData = Array.isArray(data) ? data.find((d: any) => d['@type'] === 'Event') : data;
          if (eventData && eventData.startDate) {
            events.push({
              id: `builtin-${eventData.url?.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
              title: eventData.name || 'Untitled Event',
              description: eventData.description?.substring(0, 500) || '',
              start_date: eventData.startDate,
              end_date: eventData.endDate,
              location: eventData.location?.name || eventData.location?.address?.addressLocality || 'Chicago, IL',
              format: eventData.eventAttendanceMode?.includes('Online') ? 'virtual' : 'in-person',
              type: 'meetup',
              topics: ['tech', 'professional'],
              cost: eventData.isAccessibleForFree ? 'free' : 'paid',
              price: eventData.offers?.price ? parseFloat(eventData.offers.price) : undefined,
              url: eventData.url || '',
              source: 'builtin-chicago',
              image_url: eventData.image,
              status: 'active',
            });
          }
        }
      } catch (e) {
        // Skip malformed JSON
      }
    });

    // Deduplicate by title
    const uniqueEvents = Array.from(
      new Map(events.map(e => [e.title.toLowerCase(), e])).values()
    );

    console.log(`✅ Scraped ${uniqueEvents.length} events from Built In Chicago`);
    return uniqueEvents.slice(0, 20); // Limit to 20
  } catch (error) {
    console.error('Error scraping Built In Chicago:', error);
    return [];
  }
}
