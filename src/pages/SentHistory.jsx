import { useState, useEffect } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  sent: 'bg-green-50 text-green-700 ring-green-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function SentHistory() {
  const [emails, setEmails] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  useEffect(() => {
    setLoading(true);
    api.get(`/dashboard/sent-history?page=${page}&per_page=${perPage}`)
      .then(setEmails)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sent History</h1>
        <p className="text-gray-500 mt-1">Track the status of your sent emails</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : emails.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No sent emails yet</td></tr>
            ) : (
              emails.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{e.recipient_email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{e.subject}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {e.sent_at ? new Date(e.sent_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColors[e.status] || ''}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-red-600 max-w-xs">
                    {e.error_message || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} hasMore={emails.length === perPage} />
    </div>
  );
}
