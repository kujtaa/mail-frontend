import { useState, useEffect } from 'react';
import { api } from '../api';

export default function BrowseEmails() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('category');
  const [search, setSearch] = useState('');
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [batchSize, setBatchSize] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/dashboard/browse-overview').then((ov) => {
      setOverview(ov);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePurchase = async () => {
    if (!purchaseTarget) return;
    setPurchasing(true);
    setMessage('');
    try {
      const body = { batch_size: batchSize };
      if (purchaseTarget.type === 'category') body.category = purchaseTarget.name;
      else body.city = purchaseTarget.name;

      const result = await api.post('/dashboard/purchase-batch', body);
      setMessage(`Created batch with ${result.batch_size} emails from "${purchaseTarget.name}".`);
      setPurchaseTarget(null);
      setBatchSize(0);
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const openPurchase = (item, type) => {
    setPurchaseTarget({ name: item.name, count: item.count, type });
    setBatchSize(Math.min(item.count, 50));
  };

  const filtered = (items) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Emails</h1>
        <p className="text-gray-500 mt-1">Create email batches by city or by category</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm border ${message.includes('Created') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message}
          <button onClick={() => setMessage('')} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : !overview ? (
        <div className="text-center py-16 text-gray-400">No data available</div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overview.total_available.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Emails available</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overview.by_category.length}</p>
                <p className="text-xs text-gray-500">Categories</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overview.by_city.length}</p>
                <p className="text-xs text-gray-500">Cities</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setTab('category'); setSearch(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  tab === 'category' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => { setTab('city'); setSearch(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  tab === 'city' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By City
              </button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Search ${tab === 'category' ? 'categories' : 'cities'}...`}
              />
            </div>
          </div>

          {tab === 'category' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered(overview.by_category).map((item) => (
                <div
                  key={item.name}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{item.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">emails across all cities</p>
                  </div>
                  <button
                    onClick={() => openPurchase(item, 'category')}
                    disabled={item.count === 0}
                    className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Get Emails
                  </button>
                </div>
              ))}
              {filtered(overview.by_category).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">No categories found</div>
              )}
            </div>
          )}

          {tab === 'city' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered(overview.by_city).map((item) => (
                <div
                  key={item.name}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{item.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">emails in this city</p>
                  </div>
                  <button
                    onClick={() => openPurchase(item, 'city')}
                    disabled={item.count === 0}
                    className="w-full bg-sky-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Get Emails
                  </button>
                </div>
              ))}
              {filtered(overview.by_city).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-400">No cities found</div>
              )}
            </div>
          )}
        </>
      )}

      {purchaseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Create Email Batch</h3>
            <div className="mb-5">
              <div className="flex items-center gap-2 mt-2">
                {purchaseTarget.type === 'city' ? (
                  <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-600/20 ring-inset">City</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">Category</span>
                )}
                <span className="text-sm font-semibold text-gray-900">{purchaseTarget.name}</span>
                <span className="text-xs text-gray-400">({purchaseTarget.count.toLocaleString()} available)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {purchaseTarget.type === 'city'
                  ? `All business emails located in ${purchaseTarget.name}, across all categories.`
                  : `All ${purchaseTarget.name} business emails, across all cities.`}
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">How many emails?</label>
            <input
              type="number"
              min={1}
              max={purchaseTarget.count}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(purchaseTarget.count, Number(e.target.value))))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mb-4 mt-1">
              {[10, 50, 100, purchaseTarget.count].filter((v, i, a) => v <= purchaseTarget.count && a.indexOf(v) === i).map((v) => (
                <button
                  key={v}
                  onClick={() => setBatchSize(v)}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                    batchSize === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {v === purchaseTarget.count ? 'All' : v}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 mb-6 space-y-1">
              <p className="text-green-600 font-medium">Free access</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPurchaseTarget(null); setBatchSize(0); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing || batchSize < 1}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {purchasing ? 'Creating...' : `Create ${batchSize} emails`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
