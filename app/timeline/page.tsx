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
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    location: "",
    duration: 60,
    category: "CEREMONY",
    status: "PLANNED",
  });

  const loadEvents = () => {
    fetch('/api/timeline')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load timeline events:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEvents();
  }, []);

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
    setSelectedEvent(null);
    setFormData({
      title: "",
      description: "",
      eventDate: "",
      location: "",
      duration: 60,
      category: "CEREMONY",
      status: "PLANNED",
    });
    setShowModal(true);
  };

  const openViewModal = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setModalMode('view');
    setFormData({
      title: event.title,
      description: event.description || "",
      eventDate: formatDateTimeForInput(event.eventDate),
      location: event.location || "",
      duration: event.duration,
      category: event.category,
      status: event.status,
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
        ? '/api/timeline' 
        : `/api/timeline/${selectedEvent?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          eventDate: new Date(formData.eventDate).toISOString(),
        }),
      });

      if (response.ok) {
        await loadEvents();
        setShowModal(false);
        setSelectedEvent(null);
      } else {
        alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} event`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/timeline/${selectedEvent.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadEvents();
        setShowModal(false);
        setShowDeleteConfirm(false);
        setSelectedEvent(null);
      } else {
        alert('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = filter === "ALL" 
    ? events 
    : events.filter(e => e.category === filter);

  // Sort by eventDate
  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  const planned = events.filter(e => e.status === "PLANNED").length;
  const confirmed = events.filter(e => e.status === "CONFIRMED").length;
  const complete = events.filter(e => e.status === "COMPLETE").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading timeline events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Day-Of Timeline</h1>
        <button
          onClick={openCreateModal}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="text-2xl font-bold text-gray-900">{events.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Planned</p>
          <p className="text-2xl font-bold text-orange-600">{planned}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{confirmed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Complete</p>
          <p className="text-2xl font-bold text-green-600">{complete}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="ALL">All Events</option>
            <option value="CEREMONY">Ceremony</option>
            <option value="RECEPTION">Reception</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </div>

        {sortedEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No events found</p>
            <button
              onClick={openCreateModal}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Add Your First Event
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => openViewModal(event)}
                className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-shrink-0 w-24 text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {new Date(event.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {event.duration} min
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-sm text-gray-500 mt-1">📍 {event.location}</p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    event.category === 'CEREMONY' ? 'bg-purple-100 text-purple-800' :
                    event.category === 'RECEPTION' ? 'bg-pink-100 text-pink-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {event.category}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    event.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                    event.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/View/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Add Event' : 
                 modalMode === 'view' ? 'Event Details' : 'Edit Event'}
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
                  <p className="text-sm font-medium text-gray-700">Title</p>
                  <p className="text-gray-900">{formData.title}</p>
                </div>
                {formData.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-gray-900">{formData.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Date & Time</p>
                  <p className="text-gray-900">{formatDateTime(formData.eventDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Duration</p>
                  <p className="text-gray-900">{formData.duration} minutes</p>
                </div>
                {formData.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-gray-900">{formData.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.category === 'CEREMONY' ? 'bg-purple-100 text-purple-800' :
                    formData.category === 'RECEPTION' ? 'bg-pink-100 text-pink-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {formData.category}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                    formData.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {formData.status}
                  </span>
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({...formData, eventDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 60})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="CEREMONY">Ceremony</option>
                    <option value="RECEPTION">Reception</option>
                    <option value="VENDOR">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
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
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Event' : 'Save Changes'}
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
            <h3 className="text-lg font-bold mb-2">Delete Event</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{formData.title}"? This action cannot be undone.
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
