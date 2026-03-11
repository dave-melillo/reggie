"use client";

import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  assignedTo?: string;
  vendorId?: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "PLANNING",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    assignedTo: "",
  });

  const loadTasks = () => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load tasks:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().slice(0, 10);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedTask(null);
    setFormData({
      title: "",
      description: "",
      category: "PLANNING",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: "",
      assignedTo: "",
    });
    setShowModal(true);
  };

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
    setModalMode('view');
    setFormData({
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      status: task.status,
      dueDate: formatDateForInput(task.dueDate),
      assignedTo: task.assignedTo || "",
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
        ? '/api/tasks' 
        : `/api/tasks/${selectedTask?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadTasks();
        setShowModal(false);
        setSelectedTask(null);
      } else {
        alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} task`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTasks();
        setShowModal(false);
        setShowDeleteConfirm(false);
        setSelectedTask(null);
      } else {
        alert('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = filter === "ALL" 
    ? tasks 
    : tasks.filter(t => t.status === filter);

  const todo = tasks.filter(t => t.status === "TODO").length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const done = tasks.filter(t => t.status === "DONE").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
        <button
          onClick={openCreateModal}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">To Do</p>
          <p className="text-2xl font-bold text-orange-600">{todo}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Done</p>
          <p className="text-2xl font-bold text-green-600">{done}</p>
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
            <option value="ALL">All Tasks</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No tasks found</p>
            <button
              onClick={openCreateModal}
              className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Add Your First Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => openViewModal(task)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {task.category.replace('_', ' ')}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                    {task.assignedTo && (
                      <span>Assigned to: {task.assignedTo}</span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                  task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {task.status.replace('_', ' ')}
                </span>
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
                {modalMode === 'create' ? 'Add Task' : 
                 modalMode === 'view' ? 'Task Details' : 'Edit Task'}
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
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formData.category}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Priority</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    formData.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.status === 'DONE' ? 'bg-green-100 text-green-800' :
                    formData.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {formData.status.replace('_', ' ')}
                  </span>
                </div>
                {formData.dueDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Due Date</p>
                    <p className="text-gray-900">{new Date(formData.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                {formData.assignedTo && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Assigned To</p>
                    <p className="text-gray-900">{formData.assignedTo}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="GUEST">Guest</option>
                    <option value="DAY_OF">Day Of</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Dave, Jessica"
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
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Task' : 'Save Changes'}
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
            <h3 className="text-lg font-bold mb-2">Delete Task</h3>
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
