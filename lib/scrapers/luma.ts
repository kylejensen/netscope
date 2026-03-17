import * as cheerio from 'cheerio';
import { Event } from '../types';

export async function scrapeLuma(): Promise<Event[]> {
  try {
    const response = await fetch('https://lu.ma/chicago', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.warn('Luma fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events: Event[] = [];

    // Luma uses structured data in JSON-LD format
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html() || '{}');
        if (data['@type'] === 'Event' || (Array.isArray(data) && data.some((d: any) => d['@type'] === 'Event'))) {
          const eventData = Array.isArray(data) ? data.find((d: any) => d['@type'] === 'Event') : data;
          if (eventData && eventData.startDate) {
            events.push({
              id: `luma-${eventData.url?.split('/').pop() || Math.random().toString(36).substr(2, 9)}`,
              title: eventData.name || 'Untitled Event',
              description: eventData.description?.substring(0, 500) || '',
              start_date: eventData.startDate,
              end_date: eventData.endDate,
              location: eventData.location?.name || eventData.location?.address?.addressLocality || 'Chicago, IL',
              format: eventData.eventAttendanceMode?.includes('Online') ? 'virtual' : 'in-person',
              type: 'meetup',
              topics: ['networking', 'community'],
              cost: eventData.isAccessibleForFree ? 'free' : 'paid',
              price: eventData.offers?.price ? parseFloat(eventData.offers.price) : undefined,
              url: eventData.url || `https://lu.ma/${eventData.name?.toLowerCase().replace(/\s+/g, '-')}`,
              source: 'luma',
              image_url: eventData.image,
              status: 'active',
            });
          }
        }
      } catch (e) {
        // Skip malformed JSON
      }
    });

    // Fallback: scrape HTML if no structured data found
    if (events.length === 0) {
      $('.event-card, .content-card, [data-testid*="event"]').each((i, elem) => {
        const $card = $(elem);
        const title = $card.find('h2, h3, .event-title, .title').first().text().trim();
        const dateText = $card.find('.date, .event-date, time').first().text().trim();
        const location = $card.find('.location, .venue').first().text().trim() || 'Chicago, IL';
        const url = $card.find('a').first().attr('href');

        if (title && dateText) {
          events.push({
            id: `luma-${Math.random().toString(36).substr(2, 9)}`,
            title,
            description: '',
            start_date: new Date(dateText).toISOString(),
            location,
            format: location.toLowerCase().includes('virtual') || location.toLowerCase().includes('online') ? 'virtual' : 'in-person',
            type: 'meetup',
            topics: ['networking', 'community'],
            cost: 'free',
            url: url?.startsWith('http') ? url : `https://lu.ma${url || ''}`,
            source: 'luma',
            status: 'active',
          });
        }
      });
    }

    console.log(`✅ Scraped ${events.length} events from Luma`);
    return events.slice(0, 20); // Limit to 20 events
  } catch (error) {
    console.error('Error scraping Luma:', error);
    return [];
  }
}
