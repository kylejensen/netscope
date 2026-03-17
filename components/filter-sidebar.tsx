'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Filters } from '@/lib/types';

interface FilterSidebarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const EVENT_TYPES = ['conference', 'seminar', 'webinar', 'meetup', 'workshop', 'networking'];
const FORMATS = ['in-person', 'virtual', 'hybrid'];
const COST_OPTIONS = ['free', 'paid'];
const TOPICS = ['tech', 'engineering', 'leadership', 'business', 'saas', 'marketing', 'ai', 'product'];

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const toggleFilter = (category: keyof Filters, value: string) => {
    const current = (filters[category] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    onFilterChange({ ...filters, [category]: updated });
  };
  
  const clearFilters = () => {
    onFilterChange({});
  };
  
  const hasActiveFilters = 
    (filters.type?.length ?? 0) > 0 ||
    (filters.format?.length ?? 0) > 0 ||
    (filters.cost?.length ?? 0) > 0 ||
    (filters.topics?.length ?? 0) > 0 ||
    !!filters.search;
  
  return (
    <div className="w-64 border-r border-border p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-auto p-1 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
      
      {/* Search */}
      <div>
        <label className="text-sm font-medium mb-2 block">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
      
      {/* Event Type */}
      <div>
        <label className="text-sm font-medium mb-2 block">Event Type</label>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((type) => {
            const isActive = filters.type?.includes(type);
            return (
              <Badge
                key={type}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleFilter('type', type)}
              >
                {type}
              </Badge>
            );
          })}
        </div>
      </div>
      
      {/* Format */}
      <div>
        <label className="text-sm font-medium mb-2 block">Format</label>
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((format) => {
            const isActive = filters.format?.includes(format);
            return (
              <Badge
                key={format}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleFilter('format', format)}
              >
                {format}
              </Badge>
            );
          })}
        </div>
      </div>
      
      {/* Cost */}
      <div>
        <label className="text-sm font-medium mb-2 block">Cost</label>
        <div className="flex flex-wrap gap-1.5">
          {COST_OPTIONS.map((cost) => {
            const isActive = filters.cost?.includes(cost);
            return (
              <Badge
                key={cost}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleFilter('cost', cost)}
              >
                {cost}
              </Badge>
            );
          })}
        </div>
      </div>
      
      {/* Topics */}
      <div>
        <label className="text-sm font-medium mb-2 block">Topics</label>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((topic) => {
            const isActive = filters.topics?.includes(topic);
            return (
              <Badge
                key={topic}
                variant={isActive ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleFilter('topics', topic)}
              >
                {topic}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
