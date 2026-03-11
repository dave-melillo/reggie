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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "BOTH",
    address: "",
    capacity: 150,
    rentalCost: 0,
    contact: "",
    phone: "",
    email: "",
    availableFrom: "",
    availableTo: "",
    notes: "",
  });

  const loadVenues = () => {
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
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadVenues();
        setShowForm(false);
        setFormData({
          name: "",
          type: "BOTH",
          address: "",
          capacity: 150,
          rentalCost: 0,
          contact: "",
          phone: "",
          email: "",
          availableFrom: "",
          availableTo: "",
          notes: "",
        });
      } else {
        alert('Failed to add venue');
      }
    } catch (error) {
      console.error('Error adding venue:', error);
      alert('Error adding venue');
    } finally {
      setSubmitting(false);
    }
  };

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
        <button 
          onClick={() => setShowForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
        >
          + Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">No venues added yet</p>
          <p className="text-sm text-gray-400 mb-4">Add ceremony and reception venues</p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
          >
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
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Venue</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="CEREMONY">Ceremony</option>
                  <option value="RECEPTION">Reception</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (guests)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value || "150")})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rental Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rentalCost / 100}
                  onChange={(e) => setFormData({...formData, rentalCost: Math.round(parseFloat(e.target.value || "0") * 100)})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available From *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.availableFrom}
                  onChange={(e) => setFormData({...formData, availableFrom: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available To *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.availableTo}
                  onChange={(e) => setFormData({...formData, availableTo: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
