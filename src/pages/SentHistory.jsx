import { useState, useEffect } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  sent: 'bg-green-50 text-green-700 ring-green-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
};

const RETRY_PROGRESS_KEY = 'sent_history_retry_progress_ids';

const loadSavedRetryProgress = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(RETRY_PROGRESS_KEY) || '[]');
    if (!Array.isArray(ids) || ids.length === 0) return null;

    return {
      ids,
      total: ids.length,
      sent: 0,
      failed: 0,
      pending: ids.length,
      completed: false,
    };
  } catch {
    localStorage.removeItem(RETRY_PROGRESS_KEY);
    return null;
  }
};

export default function SentHistory() {
  const [emails, setEmails] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [retryingIds, setRetryingIds] = useState(new Set());
  const [retryProgress, setRetryProgress] = useState(loadSavedRetryProgress);
  const [processingPending, setProcessingPending] = useState(false);
  const perPage = 100;

  const load = () => {
    setLoading(true);
    const statusQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
    api.get(`/dashboard/sent-history?page=${page}&per_page=${perPage}${statusQuery}`)
      .then(setEmails)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, statusFilter]);

  useEffect(() => {
    if (!emails.some((email) => email.status === 'pending')) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [emails, page, statusFilter]);

  const processNextPending = async () => {
    if (processingPending) return;
    setProcessingPending(true);
    try {
      await api.post('/dashboard/sent-history/process-next', {});
      load();
      if (retryProgress?.ids?.length) {
        refreshRetryProgress(retryProgress.ids);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingPending(false);
    }
  };

  useEffect(() => {
    if (!emails.some((email) => email.status === 'pending')) return undefined;
    const timer = setInterval(processNextPending, 5000);
    return () => clearInterval(timer);
  }, [emails, processingPending, retryProgress]);

  const refreshRetryProgress = async (ids) => {
    try {
      const progress = await api.post('/dashboard/sent-history/progress', { sent_email_ids: ids });
      setRetryProgress({ ids, ...progress });
      localStorage.setItem(RETRY_PROGRESS_KEY, JSON.stringify(ids));
      if (progress.completed) load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  useEffect(() => {
    if (retryProgress?.ids?.length) {
      refreshRetryProgress(retryProgress.ids);
    }
  }, []);

  useEffect(() => {
    if (!retryProgress || retryProgress.completed) return undefined;
    const timer = setInterval(() => refreshRetryProgress(retryProgress.ids), 3000);
    return () => clearInterval(timer);
  }, [retryProgress]);

  const clearRetryProgress = () => {
    localStorage.removeItem(RETRY_PROGRESS_KEY);
    setRetryProgress(null);
  };

  const retryEmails = async (ids) => {
    if (ids.length === 0) return;
    setMessage(null);
    setRetryingIds(new Set(ids));
    try {
      const result = await api.post('/dashboard/sent-history/retry', { sent_email_ids: ids });
      if (result.queued > 0) {
        localStorage.setItem(RETRY_PROGRESS_KEY, JSON.stringify(ids));
        setRetryProgress({
          ids,
          total: result.queued,
          sent: 0,
          failed: 0,
          pending: result.queued,
          completed: false,
        });
        setEmails((prev) => prev.map((email) => (
          ids.includes(email.id)
            ? { ...email, status: 'pending', sent_at: null, error_message: null }
            : email
        )));
        setMessage({ type: 'success', text: `Queued ${result.queued} email(s) for retry. They will send one every ${result.delay_seconds || 5} seconds.` });
        refreshRetryProgress(ids);
      } else {
        setMessage({ type: 'error', text: 'No failed or pending emails were queued. Refresh and try again.' });
      }
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRetryingIds(new Set());
    }
  };

  const retryableIds = emails.filter((email) => ['failed', 'pending'].includes(email.status)).map((email) => email.id);
  const pendingCount = emails.filter((email) => email.status === 'pending').length;
  const retryPercent = retryProgress?.total ? Math.round((retryProgress.sent / retryProgress.total) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sent History</h1>
        <p className="text-gray-500 mt-1">Track queued, sent, and failed emails</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      {retryProgress && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Retry progress</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">
                {retryProgress.sent} / {retryProgress.total} sent
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {retryProgress.pending} pending
                {retryProgress.failed > 0 ? `, ${retryProgress.failed} failed` : ''}
              </p>
            </div>
            <button
              onClick={clearRetryProgress}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${retryPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {pendingCount > 0 ? `${pendingCount} email(s) waiting in queue on this page` : 'No queued emails on this page'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Pending emails are processed automatically while this page is open. Failed emails can be retried.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Refresh
          </button>
          <button
            onClick={processNextPending}
            disabled={pendingCount === 0 || processingPending}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
          >
            {processingPending ? 'Processing...' : 'Process next pending'}
          </button>
          <button
            onClick={() => retryEmails(retryableIds)}
            disabled={retryableIds.length === 0 || retryingIds.size > 0}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
          >
            {retryingIds.size > 0 ? 'Queueing...' : 'Retry failed/pending on page'}
          </button>
        </div>
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
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : emails.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No sent emails yet</td></tr>
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
                  <td className="px-6 py-4 text-right">
                    {['failed', 'pending'].includes(e.status) ? (
                      <button
                        onClick={() => retryEmails([e.id])}
                        disabled={retryingIds.has(e.id)}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
                      >
                        {retryingIds.has(e.id) ? 'Queueing...' : e.status === 'pending' ? 'Requeue' : 'Retry'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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
