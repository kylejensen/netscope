export interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  format?: 'in-person' | 'virtual' | 'hybrid';
  type?: 'conference' | 'seminar' | 'webinar' | 'meetup' | 'workshop' | 'networking';
  topics?: string[]; // Stored as JSON in DB
  cost?: 'free' | 'paid';
  price?: number;
  url?: string;
  source?: string;
  image_url?: string;
  status?: 'active' | 'saved' | 'dismissed';
  created_at?: string;
  updated_at?: string;
}

export interface Club {
  id: string;
  name: string;
  type?: 'social' | 'professional' | 'tech' | 'coworking';
  description?: string;
  location?: string;
  address?: string;
  website?: string;
  cost_info?: string;
  membership_info?: string;
  vibe?: string;
  tags?: string[]; // Stored as JSON in DB
  status?: 'active' | 'interested' | 'applied' | 'member' | 'dismissed';
  created_at?: string;
  updated_at?: string;
}

export interface Filters {
  search?: string;
  type?: string[];
  format?: string[];
  cost?: string[];
  topics?: string[];
  dateRange?: { start?: string; end?: string };
}
