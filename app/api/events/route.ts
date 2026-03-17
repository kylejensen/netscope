import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { Event } from '@/lib/types';

// Initialize database on first request
initializeDatabase();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type');
    const format = searchParams.get('format');
    const cost = searchParams.get('cost');
    const search = searchParams.get('search');
    const topics = searchParams.get('topics');
    
    let query = 'SELECT * FROM events WHERE status = ?';
    const params: any[] = [status];
    
    if (type) {
      const types = type.split(',');
      query += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }
    
    if (format) {
      const formats = format.split(',');
      query += ` AND format IN (${formats.map(() => '?').join(',')})`;
      params.push(...formats);
    }
    
    if (cost) {
      const costs = cost.split(',');
      query += ` AND cost IN (${costs.map(() => '?').join(',')})`;
      params.push(...costs);
    }
    
    if (search) {
      query += ` AND (title LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY start_date ASC';
    
    const stmt = db.prepare(query);
    let events = stmt.all(...params) as Event[];
    
    // Filter by topics if provided (JSON field)
    if (topics) {
      const topicList = topics.split(',');
      events = events.filter(event => {
        const eventTopics = event.topics ? 
          (typeof event.topics === 'string' ? JSON.parse(event.topics) : event.topics) : 
          [];
        return topicList.some(t => eventTopics.includes(t));
      });
    }
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }
    
    const stmt = db.prepare('UPDATE events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
