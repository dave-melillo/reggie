"use client";

import { useState, useEffect } from "react";

type FinancialEntry = {
  id: string;
  category: string;
  description: string;
  budgetAmount: number;
  actualAmount: number;
  paidAmount: number;
  notes?: string;
};

export default function FinancialPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    category: "VENUE",
    description: "",
    budgetAmount: 0,
    actualAmount: 0,
    paidAmount: 0,
    notes: "",
  });

  const loadEntries = () => {
    fetch('/api/financial')
      .then(res => res.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load financial entries:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEntry(null);
    setFormData({
      category: "VENUE",
      description: "",
      budgetAmount: 0,
      actualAmount: 0,
      paidAmount: 0,
      notes: "",
    });
    setShowModal(true);
  };

  const openViewModal = (entry: FinancialEntry) => {
    setSelectedEntry(entry);
    setModalMode('view');
    setFormData({
      category: entry.category,
      description: entry.description,
      budgetAmount: entry.budgetAmount,
      actualAmount: entry.actualAmount,
      paidAmount: entry.paidAmount,
      notes: entry.notes || "",
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
        ? '/api/financial' 
        : `/api/financial/${selectedEntry?.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadEntries();
        setShowModal(false);
        setSelectedEntry(null);
      } else {
        alert(`Failed to ${modalMode === 'create' ? 'create' : 'update'} entry`);
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/financial/${selectedEntry.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadEntries();
        setShowModal(false);
        setShowDeleteConfirm(false);
        setSelectedEntry(null);
      } else {
        alert('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry');
    } finally {
      setSubmitting(false);
    }
  };

  const totalBudget = entries.reduce((sum, e) => sum + e.budgetAmount, 0);
  const totalActual = entries.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.paidAmount, 0);
  const remaining = totalBudget - totalActual;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
        <button
          onClick={openCreateModal}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          + Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Allocated</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalActual)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-600">Remaining</p>
          <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No expenses tracked yet</p>
          <button
            onClick={openCreateModal}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Add Your First Expense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => {
                  const variance = entry.actualAmount - entry.budgetAmount;
                  return (
                    <tr 
                      key={entry.id} 
                      onClick={() => openViewModal(entry)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{entry.description}</div>
                        {entry.notes && (
                          <div className="text-xs text-gray-500">{entry.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(entry.budgetAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(entry.actualAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(entry.paidAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'}>
                          {variance > 0 && '+'}{formatCurrency(variance)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Create/View/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Add Expense' : 
                 modalMode === 'view' ? 'Expense Details' : 'Edit Expense'}
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
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formData.category}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-900">{formData.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Budget Amount</p>
                  <p className="text-gray-900">{formatCurrency(formData.budgetAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Actual Amount</p>
                  <p className="text-gray-900">{formatCurrency(formData.actualAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Paid Amount</p>
                  <p className="text-green-600">{formatCurrency(formData.paidAmount)}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="VENUE">Venue</option>
                    <option value="CATERING">Catering</option>
                    <option value="PHOTOGRAPHY">Photography</option>
                    <option value="VIDEOGRAPHY">Videography</option>
                    <option value="DJ">DJ/Entertainment</option>
                    <option value="FLOWERS">Flowers</option>
                    <option value="ATTIRE">Attire</option>
                    <option value="INVITATIONS">Invitations</option>
                    <option value="TRANSPORTATION">Transportation</option>
                    <option value="DECOR">Decor</option>
                    <option value="FAVORS">Favors</option>
                    <option value="CAKE">Cake</option>
                    <option value="HAIR_MAKEUP">Hair & Makeup</option>
                    <option value="OFFICIANT">Officiant</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Trump National Golf Club deposit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.budgetAmount / 100}
                    onChange={(e) => setFormData({...formData, budgetAmount: Math.round(parseFloat(e.target.value || "0") * 100)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.actualAmount / 100}
                    onChange={(e) => setFormData({...formData, actualAmount: Math.round(parseFloat(e.target.value || "0") * 100)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.paidAmount / 100}
                    onChange={(e) => setFormData({...formData, paidAmount: Math.round(parseFloat(e.target.value || "0") * 100)})}
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
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Expense' : 'Save Changes'}
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
            <h3 className="text-lg font-bold mb-2">Delete Expense</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{formData.description}"? This action cannot be undone.
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
