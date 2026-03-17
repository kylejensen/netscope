'use client';

import { Club } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, DollarSign, Users } from 'lucide-react';

interface ClubCardProps {
  club: Club;
  onStatusChange?: (clubId: string, status: Club['status']) => void;
}

const CLUB_TYPE_COLORS: Record<string, string> = {
  social: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  professional: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  tech: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  coworking: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  interested: 'Interested',
  applied: 'Applied',
  member: 'Member',
  dismissed: 'Dismissed',
};

export function ClubCard({ club, onStatusChange }: ClubCardProps) {
  const tags = typeof club.tags === 'string' ? JSON.parse(club.tags) : club.tags || [];
  
  return (
    <Card className="group hover:border-primary/50 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {club.type && (
                <Badge className={CLUB_TYPE_COLORS[club.type] || 'bg-gray-500/10 text-gray-500'}>
                  {club.type}
                </Badge>
              )}
              {club.status && club.status !== 'active' && (
                <Badge variant="outline">
                  {STATUS_LABELS[club.status]}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
              {club.name}
            </h3>
          </div>
        </div>
        
        {club.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {club.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm text-muted-foreground mb-3">
          {club.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{club.location}</span>
            </div>
          )}
          {club.cost_info && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span>{club.cost_info}</span>
            </div>
          )}
          {club.membership_info && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{club.membership_info}</span>
            </div>
          )}
        </div>
        
        {club.vibe && (
          <div className="bg-muted/50 rounded-md p-3 mb-3">
            <p className="text-xs text-muted-foreground italic">"{club.vibe}"</p>
          </div>
        )}
        
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.slice(0, 5).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 5}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex gap-2 flex-wrap">
          {club.website && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(club.website, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Website
            </Button>
          )}
          {onStatusChange && (
            <>
              {club.status !== 'interested' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStatusChange(club.id, 'interested')}
                >
                  Interested
                </Button>
              )}
              {club.status !== 'member' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onStatusChange(club.id, 'member')}
                >
                  I'm a Member
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
