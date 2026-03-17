import { NextRequest, NextResponse } from 'next/server';
import getDb, { initializeDatabase, saveDb } from '@/lib/db';
import { Club } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    initializeDatabase(db);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = 'SELECT * FROM clubs WHERE 1=1';
    const params: any[] = [];

    if (status) {
      const statuses = status.split(',');
      query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (type) {
      const types = type.split(',');
      query += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }

    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    const stmt = db.prepare(query);
    stmt.bind(params);

    const clubs: any[] = [];
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const row = stmt.get();
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      clubs.push(obj);
    }
    stmt.free();

    // Filter by tags if provided (JSON field)
    let filteredClubs = clubs;
    if (tags) {
      const tagList = tags.split(',');
      filteredClubs = clubs.filter(club => {
        const clubTags = club.tags ?
          (typeof club.tags === 'string' ? JSON.parse(club.tags) : club.tags) :
          [];
        return tagList.some((t: string) => clubTags.includes(t));
      });
    }

    return NextResponse.json(filteredClubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await getDb();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    db.run('UPDATE clubs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    saveDb();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json({ error: 'Failed to update club' }, { status: 500 });
  }
}
