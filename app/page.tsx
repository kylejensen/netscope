'use client';

import { useState, useEffect } from 'react';
import { Event, Filters } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { FilterSidebar } from '@/components/filter-sidebar';
import { RefreshCw } from 'lucide-react';

// Local storage keys
const SAVED_EVENTS_KEY = 'netscope-saved-events';
const DISMISSED_EVENTS_KEY = 'netscope-dismissed-events';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());

  // Load saved/dismissed from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(SAVED_EVENTS_KEY) || '[]');
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_EVENTS_KEY) || '[]');
    setSavedEvents(new Set(saved));
    setDismissedEvents(new Set(dismissed));
  }, []);

  // Auto-discover real events on first load
  const [hasDiscovered, setHasDiscovered] = useState(false);

  useEffect(() => {
    const autoDiscover = async () => {
      if (hasDiscovered) return;
      setHasDiscovered(true);
      setDiscovering(true);
      try {
        const response = await fetch('/api/discover', { method: 'POST' });
        if (response.ok) {
          await fetchEvents();
        }
      } catch (error) {
        console.error('Auto-discover failed:', error);
      } finally {
        setDiscovering(false);
      }
    };
    autoDiscover();
  }, []);

  useEffect(() => {
    if (hasDiscovered) fetchEvents();
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
      
      // Filter out dismissed events on client side
      const filteredData = (Array.isArray(data) ? data : []).filter(
        (e: Event) => !dismissedEvents.has(e.id)
      );
      
      setEvents(filteredData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Discovery failed');
      }
      
      const result = await response.json();
      console.log('Discovery result:', result);
      
      // Refresh events after discovery
      await fetchEvents();
      
      alert(`✅ Discovered ${result.count} new events!`);
    } catch (error) {
      console.error('Error discovering events:', error);
      alert('❌ Failed to discover events. Check console for details.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = async (eventId: string) => {
    const newSaved = new Set(savedEvents);
    newSaved.add(eventId);
    setSavedEvents(newSaved);
    localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(Array.from(newSaved)));
    
    // Remove from dismissed if it was there
    const newDismissed = new Set(dismissedEvents);
    newDismissed.delete(eventId);
    setDismissedEvents(newDismissed);
    localStorage.setItem(DISMISSED_EVENTS_KEY, JSON.stringify(Array.from(newDismissed)));
  };

  const handleDismiss = async (eventId: string) => {
    const newDismissed = new Set(dismissedEvents);
    newDismissed.add(eventId);
    setDismissedEvents(newDismissed);
    localStorage.setItem(DISMISSED_EVENTS_KEY, JSON.stringify(Array.from(newDismissed)));
    
    // Remove from saved if it was there
    const newSaved = new Set(savedEvents);
    newSaved.delete(eventId);
    setSavedEvents(newSaved);
    localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(Array.from(newSaved)));
    
    // Remove from UI immediately
    setEvents(events.filter(e => e.id !== eventId));
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <FilterSidebar filters={filters} onFilterChange={setFilters} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold">Event Feed</h1>
              <button
                onClick={handleDiscover}
                disabled={discovering}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`} />
                {discovering ? 'Discovering...' : 'Discover Events'}
              </button>
            </div>
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
                Try adjusting your filters or click "Discover Events" to find new ones
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
