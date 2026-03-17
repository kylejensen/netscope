import { Event } from '../types';
import { scrapeTicketmaster } from './ticketmaster';
import { scrapeMeetup } from './meetup';
import { scrapeLuma } from './luma';

// Timeout guard wrapper for each scraper (8s max per source)
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

export async function scrapeAllEvents(): Promise<Event[]> {
  console.log('🔍 Starting event discovery from all sources...');

  const results = await Promise.allSettled([
    withTimeout(scrapeTicketmaster()),
    withTimeout(scrapeMeetup()),
    withTimeout(scrapeLuma()),
  ]);

  const allEvents: Event[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    } else {
      const source = ['Ticketmaster', 'Meetup', 'Luma'][index];
      console.error(`Failed to scrape ${source}:`, result.reason);
    }
  });

  // Deduplicate by title + date (fuzzy matching)
  const uniqueEvents = deduplicateEvents(allEvents);

  console.log(`✅ Total discovered: ${uniqueEvents.length} unique events`);
  return uniqueEvents;
}

function deduplicateEvents(events: Event[]): Event[] {
  const seen = new Map<string, Event>();

  for (const event of events) {
    // Create a fuzzy key based on title and date
    const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dateKey = event.start_date.split('T')[0]; // Just the date part
    const key = `${titleKey}-${dateKey}`;

    if (!seen.has(key)) {
      seen.set(key, event);
    } else {
      // Prefer events with more complete data
      const existing = seen.get(key)!;
      if ((event.description?.length || 0) > (existing.description?.length || 0)) {
        seen.set(key, event);
      }
    }
  }

  return Array.from(seen.values());
}
