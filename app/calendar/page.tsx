'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/lib/types';
import { EventCard } from '@/components/event-card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/events?status=saved');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsOnDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.start_date), date)
    );
  };

  const selectedEvents = selectedDate ? eventsOnDate(selectedDate) : [];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Calendar</h1>
            <p className="text-muted-foreground">
              View your saved events on a calendar
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={previousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    
                    {monthDays.map((day, index) => {
                      const dayEvents = eventsOnDate(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const hasEvents = dayEvents.length > 0;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            'aspect-square p-2 rounded-md text-sm transition-colors relative',
                            isSelected && 'bg-primary text-primary-foreground',
                            !isSelected && hasEvents && 'bg-accent',
                            !isSelected && !hasEvents && 'hover:bg-muted'
                          )}
                        >
                          <span>{format(day, 'd')}</span>
                          {hasEvents && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {dayEvents.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected date events */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  {selectedDate ? (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        {format(selectedDate, 'EEEE, MMMM d')}
                      </h3>
                      {selectedEvents.length > 0 ? (
                        <div className="space-y-3">
                          {selectedEvents.map(event => (
                            <div key={event.id} className="bg-card rounded-lg border p-4">
                              <h4 className="font-medium mb-1">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {event.location || 'Location TBD'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No events on this date</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a date to view events
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
