'use client';

import { useState, useEffect } from 'react';
import { Event, Filters } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { FilterSidebar } from '@/components/filter-sidebar';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'active');
      
      if (filters.type?.length) params.set('type', filters.type.join(','));
      if (filters.format?.length) params.set('format', filters.format.join(','));
      if (filters.cost?.length) params.set('cost', filters.cost.join(','));
      if (filters.topics?.length) params.set('topics', filters.topics.join(','));
      if (filters.search) params.set('search', filters.search);
      
      const response = await fetch(`/api/events?${params}`);
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (eventId: string) => {
    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'saved' }),
      });
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDismiss = async (eventId: string) => {
    try {
      await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'dismissed' }),
      });
      fetchEvents();
    } catch (error) {
      console.error('Error dismissing event:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <FilterSidebar filters={filters} onFilterChange={setFilters} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Event Feed</h1>
            <p className="text-muted-foreground">
              Discover upcoming events and networking opportunities in Chicago
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading events...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-2">No events found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
