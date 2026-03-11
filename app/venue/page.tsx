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
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedVenue(null);
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
    setShowModal(true);
  };

  const openViewModal = (venue: Venue) => {
    setSelectedVenue(venue);
    setModalMode('view');
    setFormData({
      name: venue.name,
      type: venue.type,
      address: venue.address,
      capacity: venue.capacity,
      rentalCost: venue.rentalCost,
      contact: venue.contact,
      phone: venue.phone || "",
      email: venue.email || "",
      availableFrom: formatDateTimeForInput(venue.availableFrom),
      availableTo: formatDateTimeForInput(venue.availableTo),
      notes: venue.notes || "",
    });
    setShowModal(true);
  };

  const switchToEditMode = () => {
    setModalMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = modalMode === 'create' 
        ? '/api/venue' 
        : `/api/venue/${selectedVenue?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...formData,
        availableFrom: new Date(formData.availableFrom).toISOString(),
        availableTo: new Date(formData.availableTo).toISOString(),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadVenues();
        setShowModal(false);
        setSelectedVenue(null);
      } else {
        alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} venue`);
      }
    } catch (error) {
      console.error('Error saving venue:', error);
      alert('Error saving venue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVenue) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/venue/${selectedVenue.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadVenues();
        setShowModal(false);
        setShowDeleteConfirm(false);
        setSelectedVenue(null);
      } else {
        alert('Failed to delete venue');
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
      alert('Error deleting venue');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = venues.reduce((sum, v) => sum + v.rentalCost, 0);
  const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);

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
          onClick={openCreateModal}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Venue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Venues</p>
          <p className="text-2xl font-bold text-gray-900">{venues.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Rental Cost</p>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-600">{totalCapacity} guests</p>
        </div>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No venues added yet</p>
          <button
            onClick={openCreateModal}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Add Your First Venue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              onClick={() => openViewModal(venue)}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md cursor-pointer transition-shadow"
            >
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

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <span>📍 {venue.address}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span>👥 Capacity: {venue.capacity} guests</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span>📞 {venue.contact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/View/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Add Venue' : 
                 modalMode === 'view' ? 'Venue Details' : 'Edit Venue'}
              </h2>
              {modalMode === 'view' && (
                <button
                  onClick={switchToEditMode}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  Edit
                </button>
              )}
            </div>

            {modalMode === 'view' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Venue Name</p>
                  <p className="text-gray-900">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Type</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.type === 'CEREMONY' ? 'bg-purple-100 text-purple-800' :
                    formData.type === 'RECEPTION' ? 'bg-pink-100 text-pink-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {formData.type}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-gray-900">{formData.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Capacity</p>
                  <p className="text-gray-900">{formData.capacity} guests</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Rental Cost</p>
                  <p className="text-gray-900">{formatCurrency(formData.rentalCost)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Contact</p>
                  <p className="text-gray-900">{formData.contact}</p>
                </div>
                {formData.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900">{formData.phone}</p>
                  </div>
                )}
                {formData.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900">{formData.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Available From</p>
                  <p className="text-gray-900">{formatDateTime(formData.availableFrom)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Available To</p>
                  <p className="text-gray-900">{formatDateTime(formData.availableTo)}</p>
                </div>
                {formData.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                    <p className="text-gray-900">{formData.notes}</p>
                  </div>
                )}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 150})}
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
                    placeholder="e.g., Lauren Good"
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
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Venue' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Venue</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{formData.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
