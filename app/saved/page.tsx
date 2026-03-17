'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/lib/types';
import { EventCard } from '@/components/event-card';

const SAVED_EVENTS_KEY = 'netscope-saved-events';

export default function SavedPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedEvents();
  }, []);

  const fetchSavedEvents = async () => {
    setLoading(true);
    try {
      // Get saved event IDs from localStorage
      const savedIds = JSON.parse(localStorage.getItem(SAVED_EVENTS_KEY) || '[]');
      
      if (savedIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Fetch all events and filter by saved IDs
      const response = await fetch('/api/events?status=active');
      const allEvents = await response.json();
      
      const savedEvents = (Array.isArray(allEvents) ? allEvents : []).filter(
        (e: Event) => savedIds.includes(e.id)
      );
      
      setEvents(savedEvents);
    } catch (error) {
      console.error('Error fetching saved events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (eventId: string) => {
    try {
      // Remove from localStorage
      const savedIds = JSON.parse(localStorage.getItem(SAVED_EVENTS_KEY) || '[]');
      const newSavedIds = savedIds.filter((id: string) => id !== eventId);
      localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(newSavedIds));
      
      // Update UI
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error unsaving event:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Saved Events</h1>
        <p className="text-muted-foreground">
          Events you've bookmarked for later
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading saved events...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-2">No saved events yet</p>
          <p className="text-sm text-muted-foreground">
            Browse the feed and save events you're interested in
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDismiss={handleUnsave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
