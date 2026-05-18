import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function MyBatches() {
  const [batches, setBatches] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [batchEmails, setBatchEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/my-batches').then(setBatches).finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (batchId) => {
    if (expanded === batchId) {
      setExpanded(null);
      setBatchEmails([]);
      return;
    }
    setExpanded(batchId);
    const emails = await api.get(`/dashboard/my-batches/${batchId}/emails`);
    setBatchEmails(emails);
  };

  const handleSendAll = (batchId) => {
    navigate('/send', { state: { batchId } });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.del(`/dashboard/my-batches/${deleteConfirm}`);
      setBatches((prev) => prev.filter((b) => b.id !== deleteConfirm));
      if (expanded === deleteConfirm) {
        setExpanded(null);
        setBatchEmails([]);
      }
    } catch {
      // silently fail — batch still shown
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading batches...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Batches</h1>
        <p className="text-gray-500 mt-1">View and manage your email batches</p>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No batches yet. <a href="/browse" className="text-indigo-600 hover:underline">Browse emails</a> to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(b.id)}
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">Batch #{b.id}</span>
                  <span className="text-sm font-medium text-gray-700">{b.label || b.category_name || '—'}</span>
                  {b.city_name && (
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset">
                      {b.city_name}
                    </span>
                  )}
                  {b.category_name && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                      {b.category_name}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {b.batch_size} emails
                  </span>
                  <span className="text-sm text-green-600 font-medium">Free</span>
                  {b.purchased_at && <span className="text-xs text-gray-400">{new Date(b.purchased_at).toLocaleDateString()}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSendAll(b.id); }}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Send to All
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(b.id); }}
                    className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                  <span className="text-gray-400 text-sm">{expanded === b.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === b.id && (
                <div className="border-t border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase">Business</th>
                        <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="text-left px-6 py-2 text-xs font-medium text-gray-500 uppercase">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {batchEmails.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{e.business_name}</td>
                          <td className="px-6 py-3 text-sm text-gray-600 font-mono">{e.email}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{e.city}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{e.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Batch?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete the batch and all its emails. Sent history will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
