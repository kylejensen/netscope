import { NextRequest, NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { Club } from '@/lib/types';

// Initialize database on first request
initializeDatabase();

export async function GET(request: NextRequest) {
  try {
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
    let clubs = stmt.all(...params) as Club[];
    
    // Filter by tags if provided (JSON field)
    if (tags) {
      const tagList = tags.split(',');
      clubs = clubs.filter(club => {
        const clubTags = club.tags ? 
          (typeof club.tags === 'string' ? JSON.parse(club.tags) : club.tags) : 
          [];
        return tagList.some(t => clubTags.includes(t));
      });
    }
    
    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }
    
    const stmt = db.prepare('UPDATE clubs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json({ error: 'Failed to update club' }, { status: 500 });
  }
}
