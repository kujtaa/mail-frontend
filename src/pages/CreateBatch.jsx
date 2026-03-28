import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CreateBatch() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [city, setCity] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/categories-list'),
      api.get('/dashboard/stats'),
    ]).then(([cats, s]) => {
      setCategories(cats);
      setStats(s);
    }).catch((err) => {
      setMessage(`error:${err.message}`);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const toggleCategory = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((c) => c.name)));
  const clearAll = () => setSelected(new Set());

  const selectedCategories = categories.filter((c) => selected.has(c.name));
  const estimatedCount = selectedCategories.reduce((sum, c) => sum + c.count, 0);
  const isPremium = stats?.plan === 'premium';
  const estimatedCost = isPremium ? 0 : estimatedCount;

  const handlePurchase = async () => {
    setPurchasing(true);
    setMessage('');
    try {
      const body = { categories: [...selected] };
      if (city.trim()) body.city = city.trim();
      const result = await api.post('/dashboard/purchase-batch-multi', body);
      setMessage(`success:Batch created with ${result.batch_size} emails for ${result.cost} credits.`);
      redirectTimerRef.current = setTimeout(() => navigate('/batches'), 1500);
    } catch (err) {
      setMessage(`error:${err.message}`);
    } finally {
      setPurchasing(false);
      setConfirming(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading categories...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Batch</h1>
        <p className="text-gray-500 mt-1">Select one or more categories to build a custom email batch</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm border ${
          message.startsWith('success:')
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.replace(/^(success|error):/, '')}
          <button onClick={() => setMessage('')} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories (e.g. IT, software...)"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filter by city (optional)"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Select all {search ? 'filtered' : ''}
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((cat) => (
            <label
              key={cat.name}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selected.has(cat.name)
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(cat.name)}
                onChange={() => toggleCategory(cat.name)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.count.toLocaleString()} emails</p>
              </div>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400 text-sm">No categories match your search</div>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-gray-500">Categories selected</p>
            <p className="text-2xl font-bold text-gray-900">{selected.size}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estimated emails</p>
            <p className="text-2xl font-bold text-gray-900">{estimatedCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estimated cost</p>
            <p className="text-2xl font-bold text-gray-900">
              {isPremium ? <span className="text-purple-600 text-base font-semibold">Free (Premium)</span> : `${estimatedCost} credits`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setConfirming(true)}
          disabled={selected.size === 0}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
        >
          Create Batch
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Batch Purchase</h3>
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{selected.size}</span> categories selected
              </p>
              <p className="text-sm text-gray-700">
                ~<span className="font-medium">{estimatedCount.toLocaleString()}</span> emails
              </p>
              {city.trim() && (
                <p className="text-sm text-gray-700">City filter: <span className="font-medium">{city.trim()}</span></p>
              )}
              {isPremium ? (
                <p className="text-sm text-purple-600 font-medium">Free with Premium plan</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700">Cost: <span className="font-medium">{estimatedCost} credits</span></p>
                  <p className="text-sm text-gray-700">
                    Balance: <span className={`font-medium ${(stats?.credit_balance || 0) >= estimatedCost ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats?.credit_balance || 0).toFixed(0)} credits
                    </span>
                  </p>
                  {(stats?.credit_balance || 0) < estimatedCost && (
                    <p className="text-sm text-red-600 font-medium">Insufficient credits</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing || (!isPremium && (stats?.credit_balance || 0) < estimatedCost)}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {purchasing ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
