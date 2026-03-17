import { NextRequest, NextResponse } from 'next/server';
import getDb, { initializeDatabase, saveDb } from '@/lib/db';
import { Event } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    initializeDatabase(db);

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
    stmt.bind(params);

    const events: any[] = [];
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const row = stmt.get();
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      events.push(obj);
    }
    stmt.free();

    // Filter by topics if provided (JSON field)
    let filteredEvents = events;
    if (topics) {
      const topicList = topics.split(',');
      filteredEvents = events.filter(event => {
        const eventTopics = event.topics ?
          (typeof event.topics === 'string' ? JSON.parse(event.topics) : event.topics) :
          [];
        return topicList.some((t: string) => eventTopics.includes(t));
      });
    }

    return NextResponse.json(filteredEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await getDb();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    db.run('UPDATE events SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
