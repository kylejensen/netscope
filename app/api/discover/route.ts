import { NextResponse } from 'next/server';
import { scrapeAllEvents } from '@/lib/scrapers';
import { dataStore } from '@/lib/data-store';

export async function POST() {
  try {
    dataStore.initialize();

    console.log('🔍 Starting event discovery...');
    const discoveredEvents = await scrapeAllEvents();

    // Add discovered events to the data store
    dataStore.addEvents(discoveredEvents);

    console.log(`✅ Discovery complete: ${discoveredEvents.length} events added`);

    return NextResponse.json({
      success: true,
      count: discoveredEvents.length,
      events: discoveredEvents,
    });
  } catch (error) {
    console.error('Error during event discovery:', error);
    return NextResponse.json(
      { error: 'Failed to discover events', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Send a POST request to trigger event discovery',
    sources: ['Eventbrite API', 'Luma', 'Built In Chicago'],
  });
}
