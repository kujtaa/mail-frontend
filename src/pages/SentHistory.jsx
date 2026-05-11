import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  sent: 'bg-green-50 text-green-700 ring-green-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  unsubscribed: 'bg-gray-50 text-gray-600 ring-gray-500/20',
};

const SEND_INTERVAL_MS = 10_000;
const PROGRESS_STORAGE_KEY = 'sent_history_progress_ids';

const loadSavedProgress = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '[]');
    if (!Array.isArray(ids) || ids.length === 0) return null;
    return { ids, total: ids.length, sent: 0, failed: 0, pending: ids.length, completed: false };
  } catch {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
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
  const [progress, setProgress] = useState(loadSavedProgress);
  const [processingPending, setProcessingPending] = useState(false);
  const [totalPending, setTotalPending] = useState(null);
  const processingRef = useRef(false);
  const perPage = 100;

  const load = useCallback(() => {
    setLoading(true);
    const statusQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
    api.get(`/dashboard/sent-history?page=${page}&per_page=${perPage}${statusQuery}`)
      .then(setEmails)
      .catch((err) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const fetchTotalPending = useCallback(async () => {
    try {
      const result = await api.get('/dashboard/sent-history/pending-count');
      setTotalPending(result.pending);
      return result.pending;
    } catch {
      return null;
    }
  }, []);

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingPending(true);
    try {
      const result = await api.post('/dashboard/sent-history/process-next', {});
      setTotalPending(result.remaining_pending);
      if (result.processed) {
        load();
        if (progress?.ids?.length) {
          refreshProgress(progress.ids);
        }
      }
    } catch {
      // silent - will retry on next interval
    } finally {
      processingRef.current = false;
      setProcessingPending(false);
    }
  }, [load, progress]);

  // On mount: check pending count and start processing if needed
  useEffect(() => {
    fetchTotalPending().then((count) => {
      if (count > 0) processNext();
    });
  }, []);

  // Keep processing while there are pending emails
  useEffect(() => {
    if (totalPending === 0 || totalPending === null) return undefined;
    const timer = setInterval(processNext, SEND_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [totalPending, processNext]);

  const refreshProgress = async (ids) => {
    try {
      const chunkSize = 500;
      let sent = 0, failed = 0, pending = 0;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const p = await api.post('/dashboard/sent-history/progress', { sent_email_ids: chunk });
        sent += p.sent;
        failed += p.failed;
        pending += p.pending;
      }
      const total = ids.length;
      const completed = pending === 0;
      setProgress({ ids, total, sent, failed, pending, completed });
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(ids));
      if (completed) {
        load();
        localStorage.removeItem(PROGRESS_STORAGE_KEY);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Resume progress tracking on mount
  useEffect(() => {
    if (progress?.ids?.length) refreshProgress(progress.ids);
  }, []);

  // Poll progress while sending in progress
  useEffect(() => {
    if (!progress || progress.completed) return undefined;
    const timer = setInterval(() => refreshProgress(progress.ids), 5000);
    return () => clearInterval(timer);
  }, [progress]);

  const retryEmails = async (ids) => {
    if (ids.length === 0) return;
    setMessage(null);
    setRetryingIds(new Set(ids));
    try {
      const result = await api.post('/dashboard/sent-history/retry', { sent_email_ids: ids });
      if (result.queued > 0) {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(ids));
        setProgress({ ids, total: result.queued, sent: 0, failed: 0, pending: result.queued, completed: false });
        setEmails((prev) => prev.map((email) =>
          ids.includes(email.id) ? { ...email, status: 'pending', sent_at: null, error_message: null } : email
        ));
        setTotalPending((prev) => Math.max(prev ?? 0, result.queued));
        setMessage({ type: 'success', text: `${result.queued} email(s) reset and queued. This page will send them automatically.` });
        processNext();
      } else {
        setMessage({ type: 'error', text: 'No failed or pending emails found to retry.' });
      }
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRetryingIds(new Set());
    }
  };

  const cancelAllPending = async () => {
    if (!window.confirm(`Cancel all ${totalPending} pending emails? They will be marked as failed and can be retried later.`)) return;
    try {
      const result = await api.post('/dashboard/sent-history/cancel-pending', {});
      setTotalPending(0);
      setProgress(null);
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
      setMessage({ type: 'success', text: `Cancelled ${result.cancelled} pending email(s). You can retry them later.` });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const retryableIds = emails.filter((e) => ['failed', 'pending'].includes(e.status)).map((e) => e.id);
  const progressPercent = progress?.total ? Math.round((progress.sent / progress.total) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sent History</h1>
        <p className="text-gray-500 mt-1">Track queued, sent, and failed emails</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      {progress && !progress.completed && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Sending in progress — keep this page open</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{progress.sent} / {progress.total} sent</p>
              <p className="text-xs text-indigo-700 mt-1">
                {progress.pending} pending{progress.failed > 0 ? `, ${progress.failed} failed` : ''}
                {' · '}~{Math.ceil((progress.pending * SEND_INTERVAL_MS) / 60000)} min remaining
              </p>
            </div>
            <button
              onClick={() => { localStorage.removeItem(PROGRESS_STORAGE_KEY); setProgress(null); }}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {progress?.completed && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-green-800">
            Batch complete — {progress.sent} sent{progress.failed > 0 ? `, ${progress.failed} failed` : ''}
          </p>
          <button
            onClick={() => { localStorage.removeItem(PROGRESS_STORAGE_KEY); setProgress(null); }}
            className="text-xs text-green-700 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {totalPending !== null && totalPending > 0 ? (
            <p className="text-sm font-medium text-gray-900">
              {processingPending ? 'Sending...' : `${totalPending} email(s) pending — sending automatically`}
            </p>
          ) : (
            <p className="text-sm font-medium text-gray-900">No pending emails</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Emails send one every {SEND_INTERVAL_MS / 1000}s while this page is open. Failed emails can be retried.
          </p>
          {totalPending > 0 && (
            <button
              onClick={cancelAllPending}
              className="mt-2 text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
            >
              Cancel all pending
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
            onClick={processNext}
            disabled={processingPending}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
          >
            {processingPending ? 'Sending...' : 'Send next now'}
          </button>
          <button
            onClick={() => retryEmails(retryableIds)}
            disabled={retryableIds.length === 0 || retryingIds.size > 0}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
          >
            {retryingIds.size > 0 ? 'Queueing...' : `Retry failed/pending (${retryableIds.length})`}
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
            ) : emails.map((e) => (
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
                <td className="px-6 py-4 text-xs text-red-600 max-w-xs">{e.error_message || '—'}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} setPage={setPage} hasMore={emails.length === perPage} />
    </div>
  );
}
