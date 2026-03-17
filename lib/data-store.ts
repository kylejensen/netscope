import { Event, Club } from './types';
import { seedClubs, seedEvents } from './seed-data';

// In-memory data store for Vercel serverless deployment
// User preferences (saved/dismissed) are stored client-side in localStorage

class DataStore {
  private events: Map<string, Event> = new Map();
  private clubs: Map<string, Club> = new Map();
  private initialized = false;

  initialize() {
    if (this.initialized) return;

    // Load seed data
    seedEvents.forEach(event => {
      this.events.set(event.id, { ...event });
    });

    seedClubs.forEach(club => {
      this.clubs.set(club.id, { ...club });
    });

    this.initialized = true;
    console.log(`📦 DataStore initialized: ${this.events.size} events, ${this.clubs.size} clubs`);
  }

  // Events
  getAllEvents(): Event[] {
    return Array.from(this.events.values());
  }

  getEventById(id: string): Event | undefined {
    return this.events.get(id);
  }

  addEvents(events: Event[]) {
    events.forEach(event => {
      this.events.set(event.id, event);
    });
  }

  updateEvent(id: string, updates: Partial<Event>) {
    const event = this.events.get(id);
    if (event) {
      this.events.set(id, { ...event, ...updates, updated_at: new Date().toISOString() });
    }
  }

  deleteEvent(id: string) {
    this.events.delete(id);
  }

  // Clubs
  getAllClubs(): Club[] {
    return Array.from(this.clubs.values());
  }

  getClubById(id: string): Club | undefined {
    return this.clubs.get(id);
  }

  addClub(club: Club) {
    this.clubs.set(club.id, club);
  }

  updateClub(id: string, updates: Partial<Club>) {
    const club = this.clubs.get(id);
    if (club) {
      this.clubs.set(id, { ...club, ...updates, updated_at: new Date().toISOString() });
    }
  }

  deleteClub(id: string) {
    this.clubs.delete(id);
  }

  // Clear discovered events (for refresh)
  clearDiscoveredEvents() {
    const discovered = Array.from(this.events.values()).filter(e => e.source !== 'sample');
    discovered.forEach(e => this.events.delete(e.id));
  }
}

// Singleton instance
export const dataStore = new DataStore();
