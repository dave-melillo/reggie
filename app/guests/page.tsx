"use client";

import { useState, useEffect } from "react";

type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  category: string;
  inviteType: string;
  plusOne: boolean;
  rsvpStatus: string;
  dietaryRestrictions?: string;
  notes?: string;
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    category: "FAMILY",
    inviteType: "CEREMONY_RECEPTION",
    plusOne: false,
    rsvpStatus: "PENDING",
    dietaryRestrictions: "",
    notes: "",
  });

  const loadGuests = () => {
    fetch('/api/guests')
      .then(res => res.json())
      .then(data => {
        setGuests(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load guests:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedGuest(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      category: "FAMILY",
      inviteType: "CEREMONY_RECEPTION",
      plusOne: false,
      rsvpStatus: "PENDING",
      dietaryRestrictions: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openViewModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setModalMode('view');
    setFormData({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || "",
      phone: guest.phone || "",
      category: guest.category,
      inviteType: guest.inviteType,
      plusOne: guest.plusOne,
      rsvpStatus: guest.rsvpStatus,
      dietaryRestrictions: guest.dietaryRestrictions || "",
      notes: guest.notes || "",
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
        ? '/api/guests' 
        : `/api/guests/${selectedGuest?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadGuests();
        setShowModal(false);
        setSelectedGuest(null);
      } else {
        alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} guest`);
      }
    } catch (error) {
      console.error('Error saving guest:', error);
      alert('Error saving guest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGuest) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/guests/${selectedGuest.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadGuests();
        setShowModal(false);
        setShowDeleteConfirm(false);
        setSelectedGuest(null);
      } else {
        alert('Failed to delete guest');
      }
    } catch (error) {
      console.error('Error deleting guest:', error);
      alert('Error deleting guest');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGuests = filter === "ALL" 
    ? guests 
    : guests.filter(g => g.category === filter);

  const confirmed = guests.filter(g => g.rsvpStatus === "CONFIRMED").length;
  const declined = guests.filter(g => g.rsvpStatus === "DECLINED").length;
  const pending = guests.filter(g => g.rsvpStatus === "PENDING").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading guests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Guest Management</h1>
        <button
          onClick={openCreateModal}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Guest
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Invited</p>
          <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{confirmed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Declined</p>
          <p className="text-2xl font-bold text-red-600">{declined}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{pending}</p>
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
            <option value="ALL">All Guests</option>
            <option value="FAMILY">Family</option>
            <option value="FRIEND">Friends</option>
            <option value="WORK">Work</option>
            <option value="VENDOR">Vendors</option>
          </select>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No guests found</p>
            <button
              onClick={openCreateModal}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Add Your First Guest
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSVP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plus One
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dietary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.map((guest) => (
                  <tr 
                    key={guest.id} 
                    onClick={() => openViewModal(guest)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {guest.firstName} {guest.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {guest.email || guest.phone || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {guest.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        guest.rsvpStatus === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        guest.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {guest.rsvpStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.plusOne ? '✓' : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {guest.dietaryRestrictions || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create/View/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Add Guest' : 
                 modalMode === 'view' ? 'Guest Details' : 'Edit Guest'}
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
                  <p className="text-sm font-medium text-gray-700">Name</p>
                  <p className="text-gray-900">{formData.firstName} {formData.lastName}</p>
                </div>
                {formData.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900">{formData.email}</p>
                  </div>
                )}
                {formData.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900">{formData.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <p className="text-gray-900">{formData.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Invite Type</p>
                  <p className="text-gray-900">{formData.inviteType.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">RSVP Status</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    formData.rsvpStatus === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                    formData.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {formData.rsvpStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Plus One</p>
                  <p className="text-gray-900">{formData.plusOne ? 'Yes' : 'No'}</p>
                </div>
                {formData.dietaryRestrictions && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dietary Restrictions</p>
                    <p className="text-gray-900">{formData.dietaryRestrictions}</p>
                  </div>
                )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="FAMILY">FAMILY</option>
                    <option value="FRIEND">FRIEND</option>
                    <option value="WORK">WORK</option>
                    <option value="VENDOR">VENDOR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invite Type *
                  </label>
                  <select 
                    value={formData.inviteType}
                    onChange={(e) => setFormData({...formData, inviteType: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="CEREMONY_RECEPTION">CEREMONY_RECEPTION</option>
                    <option value="RECEPTION_ONLY">RECEPTION_ONLY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RSVP Status *
                  </label>
                  <select 
                    value={formData.rsvpStatus}
                    onChange={(e) => setFormData({...formData, rsvpStatus: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="DECLINED">DECLINED</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="plusOne"
                    checked={formData.plusOne}
                    onChange={(e) => setFormData({...formData, plusOne: e.target.checked})}
                    className="mr-2" 
                  />
                  <label htmlFor="plusOne" className="text-sm text-gray-700">Plus One</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dietary Restrictions
                  </label>
                  <textarea
                    value={formData.dietaryRestrictions}
                    onChange={(e) => setFormData({...formData, dietaryRestrictions: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={2}
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
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Guest' : 'Save Changes'}
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
            <h3 className="text-lg font-bold mb-2">Delete Guest</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete {formData.firstName} {formData.lastName}? This action cannot be undone.
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
