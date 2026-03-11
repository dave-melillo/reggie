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
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
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
  }, []);

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
          onClick={() => setShowForm(true)}
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
              onClick={() => setShowForm(true)}
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
                  <tr key={guest.id} className="hover:bg-gray-50">
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Guest</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option>FAMILY</option>
                  <option>FRIEND</option>
                  <option>WORK</option>
                  <option>VENDOR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Type *
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option>CEREMONY_RECEPTION</option>
                  <option>RECEPTION_ONLY</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" className="mr-2" id="plusOne" />
                <label htmlFor="plusOne" className="text-sm text-gray-700">Plus One</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Restrictions
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Add Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
