'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const AVAILABLE_TOPICS = [
  'tech', 'engineering', 'leadership', 'business', 'saas', 
  'marketing', 'ai', 'product', 'startups', 'finance'
];

export default function SettingsPage() {
  const [location, setLocation] = useState('Chicago');
  const [interests, setInterests] = useState(['tech', 'engineering', 'leadership', 'business']);

  const toggleInterest = (topic: string) => {
    setInterests(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    alert('Settings saved! (This would persist to the database in production)');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Customize your NetScope experience
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Set your location and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Chicago"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Events and clubs will be filtered based on this location
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>
              Select topics you're interested in to get better recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOPICS.map((topic) => (
                <Badge
                  key={topic}
                  variant={interests.includes(topic) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleInterest(topic)}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive updates (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Weekly digest email</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>New event notifications</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Upcoming event reminders</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure external API integrations for live event data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Eventbrite API Key</label>
              <Input
                type="password"
                placeholder="Enter your Eventbrite API key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://www.eventbrite.com/platform/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Eventbrite Platform
                </a>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Meetup API Key (Optional)</label>
              <Input
                type="password"
                placeholder="Enter your Meetup API key"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Note: API keys are optional. The app works with sample data out of the box.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
