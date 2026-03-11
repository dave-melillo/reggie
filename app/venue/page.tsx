"use client";

export default function VenuePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Venue Management</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
          + Add Venue
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <p className="text-gray-500 text-lg mb-2">No venues added yet</p>
        <p className="text-sm text-gray-400">Add ceremony and reception venues</p>
      </div>
    </div>
  );
}
