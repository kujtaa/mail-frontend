import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';

const PER_PAGE = 20;

const SOURCE_BADGE = {
  link: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  manual: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

function parseEmails(text) {
  return [...new Set(
    text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
  )];
}

export default function Unsubscribed() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, link: 0, manual: 0 });
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const debounce = useRef(null);
  const [loading, setLoading] = useState(true);

  const [input, setInput] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search: searchDebounced, source, page, per_page: PER_PAGE });
    api.get(`/dashboard/unsubscribed?${params}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setCounts(data.counts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchDebounced, source, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setSearchDebounced(val); setPage(1); }, 400);
  };

  const handleSourceFilter = (val) => { setSource(val); setPage(1); };

  const pendingEmails = parseEmails(input);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (pendingEmails.length === 0) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/dashboard/unsubscribed', { emails: pendingEmails, note: note.trim() || null });
      setResult(res);
      setInput('');
      setNote('');
      setPage(1);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filterBtn = (key, label, count) => (
    <button
      key={key}
      onClick={() => handleSourceFilter(key)}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        source === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label} <span className={source === key ? 'text-indigo-200' : 'text-gray-400'}>{count.toLocaleString()}</span>
    </button>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Unsubscribed Emails</h1>
        <p className="text-gray-500 mt-1">
          Addresses on this list are never emailed again. Entries are permanent and cannot be removed.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-900 font-bold cursor-pointer">x</button>
        </div>
      )}

      {result && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
          <span className="font-medium">{result.detail}.</span>
          {result.existing?.length > 0 && (
            <span className="ml-1 text-green-800">Already listed: {result.existing.join(', ')}.</span>
          )}
          {result.invalid?.length > 0 && (
            <span className="ml-1 text-amber-700">Skipped invalid: {result.invalid.join(', ')}.</span>
          )}
          <button onClick={() => setResult(null)} className="ml-2 text-green-900 font-bold cursor-pointer">x</button>
        </div>
      )}

      {/* ── Manual add ─────────────────────────────────── */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Add emails manually</h2>
        <p className="text-sm text-gray-500 mb-4">
          Paste one or more addresses, separated by commas, spaces, or new lines. Existing entries are left untouched.
        </p>
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder={'john@example.com\nsales@company.ch, info@shop.ch'}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Note (optional), e.g. requested by phone"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || pendingEmails.length === 0}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting
                ? 'Adding...'
                : pendingEmails.length > 1
                  ? `Unsubscribe ${pendingEmails.length} emails`
                  : 'Unsubscribe email'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-1">
          {filterBtn('all', 'All', counts.all)}
          {filterBtn('link', 'Via link', counts.link)}
          {filterBtn('manual', 'Added manually', counts.manual)}
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by email..."
            className="w-72 pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">City</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Unsubscribed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No unsubscribed emails</td></tr>
            ) : items.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono text-gray-900">{u.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{u.business_name || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{u.city || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{u.category || '—'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SOURCE_BADGE[u.source] || 'bg-gray-50 text-gray-600 ring-gray-500/20'}`}>
                    {u.source === 'manual' ? 'Manual' : 'Link'}
                  </span>
                  {u.source === 'manual' && (u.added_by || u.note) && (
                    <div className="mt-1 text-xs text-gray-400">
                      {u.added_by && <span>by {u.added_by}</span>}
                      {u.added_by && u.note && <span> · </span>}
                      {u.note && <span title={u.note}>{u.note}</span>}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {u.unsubscribed_at ? new Date(u.unsubscribed_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={total} perPage={PER_PAGE} />
    </div>
  );
}
