"use client";

import { useState, useEffect } from "react";

type TimelineEvent = {
  id: string;
  eventDate: string;
  title: string;
  description?: string;
  location?: string;
  duration: number;
  category: string;
  status: string;
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/timeline')
      .then(res => res.json())
      .then(data => {
        setEvents(data.sort((a: TimelineEvent, b: TimelineEvent) => 
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        ));
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load timeline:', err);
        setLoading(false);
      });
  }, []);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading timeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Day-Of Timeline</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
          + Add Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No timeline events yet</p>
          <p className="text-sm text-gray-400 mb-4">Create your wedding day schedule</p>
          <button className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700">
            Add Your First Event
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {/* Events */}
            <div className="space-y-6">
              {events.map((event) => (
                <div key={event.id} className="relative flex items-start space-x-4">
                  {/* Time dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${
                      event.category === 'CEREMONY' ? 'bg-purple-100 text-purple-800' :
                      event.category === 'RECEPTION' ? 'bg-pink-100 text-pink-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {formatTime(event.eventDate)}
                    </div>
                  </div>
                  
                  {/* Event details */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.duration} minutes</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        event.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                        event.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                    )}
                    {event.location && (
                      <p className="text-sm text-gray-500">
                        📍 {event.location}
                      </p>
                    )}
                    <div className="mt-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {event.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
