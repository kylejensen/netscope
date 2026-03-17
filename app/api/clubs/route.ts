import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';

export async function GET(request: NextRequest) {
  try {
    dataStore.initialize();

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let clubs = dataStore.getAllClubs();

    // Filter by status
    if (statusParam) {
      const statuses = statusParam.split(',');
      clubs = clubs.filter(c => c.status && statuses.includes(c.status));
    }

    // Filter by type
    if (type) {
      const types = type.split(',');
      clubs = clubs.filter(c => c.type && types.includes(c.type));
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      clubs = clubs.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.description && c.description.toLowerCase().includes(searchLower))
      );
    }

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',');
      clubs = clubs.filter(c =>
        c.tags && tagList.some(t => c.tags!.includes(t))
      );
    }

    // Sort by name
    clubs.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    dataStore.initialize();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    dataStore.updateClub(id, { status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json({ error: 'Failed to update club' }, { status: 500 });
  }
}
