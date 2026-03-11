"use client";

import { useState, useEffect } from "react";

type Venue = {
  id: string;
  name: string;
  type: string;
  address: string;
  capacity: number;
  rentalCost: number;
  contact: string;
  phone?: string;
  email?: string;
  availableFrom: string;
  availableTo: string;
  notes?: string;
};

export default function VenuePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/venue')
      .then(res => res.json())
      .then(data => {
        setVenues(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load venues:', err);
        setLoading(false);
      });
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

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
        <p className="text-gray-500">Loading venues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Venue Management</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
          + Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No venues added yet</p>
          <p className="text-sm text-gray-400 mb-4">Add ceremony and reception venues</p>
          <button className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700">
            Add Your First Venue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{venue.name}</h2>
                  <span className={`inline-block px-3 py-1 mt-2 text-sm font-semibold rounded-full ${
                    venue.type === 'CEREMONY' ? 'bg-purple-100 text-purple-800' :
                    venue.type === 'RECEPTION' ? 'bg-pink-100 text-pink-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {venue.type}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(venue.rentalCost)}</p>
                  <p className="text-xs text-gray-500">Rental Cost</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-sm text-gray-600">{venue.address}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Capacity</p>
                  <p className="text-sm text-gray-600">{venue.capacity} guests</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Available Hours</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(venue.availableFrom)} - {formatTime(venue.availableTo)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Contact</p>
                  <p className="text-sm text-gray-600">{venue.contact}</p>
                  {venue.phone && (
                    <p className="text-sm text-gray-500">{venue.phone}</p>
                  )}
                  {venue.email && (
                    <p className="text-sm text-gray-500">{venue.email}</p>
                  )}
                </div>

                {venue.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                    <p className="text-sm text-gray-600">{venue.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Edit Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
