"use client";

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Day-Of Timeline</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
          + Add Event
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No timeline events yet</p>
          <p className="text-sm">Create your wedding day schedule</p>
        </div>
      </div>
    </div>
  );
}
