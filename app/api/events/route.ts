import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { Event } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    dataStore.initialize();

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');
    const type = searchParams.get('type');
    const format = searchParams.get('format');
    const cost = searchParams.get('cost');
    const search = searchParams.get('search');
    const topics = searchParams.get('topics');

    let events = dataStore.getAllEvents();

    // Filter by status (client-side status is managed in localStorage, but we keep 'active' as default for server)
    // For now, we only serve 'active' events from the server
    events = events.filter(e => !statusParam || e.status === statusParam);

    // Filter by type
    if (type) {
      const types = type.split(',');
      events = events.filter(e => e.type && types.includes(e.type));
    }

    // Filter by format
    if (format) {
      const formats = format.split(',');
      events = events.filter(e => e.format && formats.includes(e.format));
    }

    // Filter by cost
    if (cost) {
      const costs = cost.split(',');
      events = events.filter(e => e.cost && costs.includes(e.cost));
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      events = events.filter(e =>
        e.title.toLowerCase().includes(searchLower) ||
        (e.description && e.description.toLowerCase().includes(searchLower))
      );
    }

    // Filter by topics
    if (topics) {
      const topicList = topics.split(',');
      events = events.filter(e =>
        e.topics && topicList.some(t => e.topics!.includes(t))
      );
    }

    // Sort by start date
    events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// Note: PATCH is no longer needed for status updates since we're using localStorage on client
// However, keeping it for potential future server-side updates
export async function PATCH(request: NextRequest) {
  try {
    dataStore.initialize();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    dataStore.updateEvent(id, { status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
