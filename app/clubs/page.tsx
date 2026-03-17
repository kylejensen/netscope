'use client';

import { useState, useEffect } from 'react';
import { Club } from '@/lib/types';
import { ClubCard } from '@/components/club-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

const CLUB_TYPES = ['social', 'professional', 'tech', 'coworking'];
const STATUS_FILTERS = ['active', 'interested', 'applied', 'member'];

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(['active', 'interested', 'applied', 'member']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, [typeFilter, statusFilter]);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter.length) params.set('status', statusFilter.join(','));
      if (typeFilter.length) params.set('type', typeFilter.join(','));
      
      const response = await fetch(`/api/clubs?${params}`);
      const data = await response.json();
      setClubs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (clubId: string, status: Club['status']) => {
    try {
      await fetch('/api/clubs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clubId, status }),
      });
      fetchClubs();
    } catch (error) {
      console.error('Error updating club status:', error);
    }
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredClubs = clubs.filter(club =>
    !search || 
    club.name.toLowerCase().includes(search.toLowerCase()) ||
    club.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clubs & Communities</h1>
        <p className="text-muted-foreground">
          Explore professional clubs and networking communities in Chicago
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {CLUB_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={typeFilter.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleTypeFilter(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((status) => (
                <Badge
                  key={status}
                  variant={statusFilter.includes(status) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleStatusFilter(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading clubs...</div>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-2">No clubs found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
