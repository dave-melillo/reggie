"use client";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
        <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
          + Add Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">To Do</p>
          <p className="text-2xl font-bold text-orange-600">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Done</p>
          <p className="text-2xl font-bold text-green-600">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <p className="text-gray-500 text-lg">No tasks created yet</p>
      </div>
    </div>
  );
}
