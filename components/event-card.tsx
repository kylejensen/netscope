'use client';

import { Event } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCost } from '@/lib/utils';
import { Calendar, MapPin, ExternalLink, Bookmark, X } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onSave?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  seminar: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  webinar: 'bg-green-500/10 text-green-500 border-green-500/20',
  meetup: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  workshop: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  networking: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

const FORMAT_COLORS: Record<string, string> = {
  'in-person': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'virtual': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  'hybrid': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

export function EventCard({ event, onSave, onDismiss }: EventCardProps) {
  const topics = typeof event.topics === 'string' ? JSON.parse(event.topics) : event.topics || [];
  
  return (
    <Card className="group hover:border-primary/50 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {event.type && (
                <Badge className={EVENT_TYPE_COLORS[event.type] || 'bg-gray-500/10 text-gray-500'}>
                  {event.type}
                </Badge>
              )}
              {event.format && (
                <Badge className={FORMAT_COLORS[event.format] || 'bg-gray-500/10 text-gray-500'}>
                  {event.format}
                </Badge>
              )}
              {event.cost && (
                <Badge variant="outline" className="text-xs">
                  {formatCost(event.cost, event.price)}
                </Badge>
              )}
              {event.source && (
                <span className="text-xs text-muted-foreground">
                  via {event.source}
                </span>
              )}
            </div>
            
            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            
            {event.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {event.description}
              </p>
            )}
            
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.start_date)}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
            
            {topics.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {topics.slice(0, 4).map((topic: string) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {topics.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{topics.length - 4}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              {event.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(event.url, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Register
                </Button>
              )}
              {onSave && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSave(event.id)}
                  className="gap-2"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(event.id)}
                  className="gap-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
