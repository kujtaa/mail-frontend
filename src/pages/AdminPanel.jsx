import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';
import Pagination from '../components/Pagination';
import ScrapeMap from '../components/ScrapeMap';

export default function AdminPanel() {
  const [tab, setTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [allEmails, setAllEmails] = useState([]);
  const [emailTotal, setEmailTotal] = useState(0);
  const [emailPage, setEmailPage] = useState(1);
  const [emailCity, setEmailCity] = useState('all');
  const [emailCat, setEmailCat] = useState('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [emailSearchDebounced, setEmailSearchDebounced] = useState('');
  const emailDebounce = useRef(null);

  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditDesc, setCreditDesc] = useState('');

  const [scrapeSource, setScrapeSource] = useState('local.ch');
  const [scrapeCity, setScrapeCity] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [scrapeCities, setScrapeCities] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [scrapedCombos, setScrapedCombos] = useState([]);
  const [scrapeJobs, setScrapeJobs] = useState([]);
  const pollingRef = useRef(null);

  const [noWebBiz, setNoWebBiz] = useState([]);
  const [noWebTotal, setNoWebTotal] = useState(0);
  const [noWebPage, setNoWebPage] = useState(1);
  const [noWebCity, setNoWebCity] = useState('all');
  const [noWebCatFilter, setNoWebCatFilter] = useState('all');
  const [noWebSearch, setNoWebSearch] = useState('');
  const [noWebSearchDebounced, setNoWebSearchDebounced] = useState('');
  const noWebDebounce = useRef(null);

  const [filterCities, setFilterCities] = useState([]);
  const [filterCats, setFilterCats] = useState([]);

  const [coverageSource, setCoverageSource] = useState('local.ch');
  const [coverageData, setCoverageData] = useState(null);
  const [coverageCityFilter, setCoverageCityFilter] = useState('all');
  const [coverageCatFilter, setCoverageCatFilter] = useState('all');

  const [planModal, setPlanModal] = useState(null);
  const [planType, setPlanType] = useState('premium');
  const [planDays, setPlanDays] = useState(30);
  const [planDailyLimit, setPlanDailyLimit] = useState(200);

  const [message, setMessage] = useState('');

  const loadFilterOptions = () => {
    api.get('/admin/filter-options').then((data) => {
      setFilterCities(data.cities);
      setFilterCats(data.categories);
    });
  };

  const loadCoverage = (src) => {
    const s = src || coverageSource;
    api.get(`/admin/unscraped?source=${encodeURIComponent(s)}`).then(setCoverageData);
  };

  const loadScrapeOptions = (source) => {
    const src = source || scrapeSource;
    api.get(`/admin/scrape-options?source=${encodeURIComponent(src)}`).then((data) => {
      setScrapeCities(data.cities);
      setCategoryOptions(data.categories);
      setScrapedCombos(data.scraped);
    });
  };

  const loadJobs = () => {
    api.get('/admin/scrape-jobs').then(setScrapeJobs);
  };

  const loadEmails = useCallback(() => {
    const params = new URLSearchParams({
      category: emailCat, city: emailCity, search: emailSearchDebounced,
      page: emailPage, per_page: 20,
    });
    api.get(`/admin/all-emails?${params}`).then((data) => {
      setAllEmails(data.emails);
      setEmailTotal(data.total);
    });
  }, [emailCat, emailCity, emailSearchDebounced, emailPage]);

  const loadNoWeb = useCallback(() => {
    const params = new URLSearchParams({
      city: noWebCity, category: noWebCatFilter, search: noWebSearchDebounced,
      page: noWebPage, per_page: 20,
    });
    api.get(`/admin/no-website-businesses?${params}`).then((data) => {
      setNoWebBiz(data.businesses);
      setNoWebTotal(data.total);
    });
  }, [noWebCity, noWebCatFilter, noWebSearchDebounced, noWebPage]);

  useEffect(() => {
    if (tab === 'companies') api.get('/admin/companies').then(setCompanies);
    if (tab === 'transactions') api.get('/admin/transactions').then(setTransactions);
    if (tab === 'scrape') { loadScrapeOptions(); loadJobs(); }
    if (tab === 'emails' || tab === 'no-website') loadFilterOptions();
    if (tab === 'coverage') loadCoverage();
  }, [tab]);

  useEffect(() => { if (tab === 'emails') loadEmails(); }, [tab, loadEmails]);
  useEffect(() => { if (tab === 'no-website') loadNoWeb(); }, [tab, loadNoWeb]);

  useEffect(() => {
    const hasActive = scrapeJobs.some((j) => j.status === 'running' || j.status === 'queued');
    if (hasActive && tab === 'scrape') {
      pollingRef.current = setInterval(() => {
        api.get('/admin/scrape-jobs').then((jobs) => {
          setScrapeJobs(jobs);
          if (!jobs.some((j) => j.status === 'running' || j.status === 'queued')) {
            clearInterval(pollingRef.current);
            loadScrapeOptions();
          }
        });
      }, 3000);
    }
    return () => clearInterval(pollingRef.current);
  }, [scrapeJobs, tab]);

  const handleEmailSearch = (val) => {
    setEmailSearch(val);
    clearTimeout(emailDebounce.current);
    emailDebounce.current = setTimeout(() => { setEmailSearchDebounced(val); setEmailPage(1); }, 400);
  };

  const handleNoWebSearch = (val) => {
    setNoWebSearch(val);
    clearTimeout(noWebDebounce.current);
    noWebDebounce.current = setTimeout(() => { setNoWebSearchDebounced(val); setNoWebPage(1); }, 400);
  };

  const handleAddCredits = async () => {
    try {
      await api.post('/admin/add-credits', {
        company_id: creditModal.id, amount: creditAmount, description: creditDesc,
      });
      setCreditModal(null); setCreditAmount(0); setCreditDesc('');
      api.get('/admin/companies').then(setCompanies);
      setMessage('Credits added successfully');
    } catch (err) { setMessage(err.message); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate company "${name}"?`)) return;
    try {
      await api.del(`/admin/companies/${id}`);
      api.get('/admin/companies').then(setCompanies);
      setMessage(`Company "${name}" deactivated`);
    } catch (err) { setMessage(err.message); }
  };

  const handleApprove = async (id, name) => {
    try {
      await api.post(`/admin/approve/${id}`);
      api.get('/admin/companies').then(setCompanies);
      setMessage(`Company "${name}" approved`);
    } catch (err) { setMessage(err.message); }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Revoke approval for company "${name}"?`)) return;
    try {
      await api.post(`/admin/reject/${id}`);
      api.get('/admin/companies').then(setCompanies);
      setMessage(`Approval revoked for "${name}"`);
    } catch (err) { setMessage(err.message); }
  };

  const handleSetPlan = async () => {
    if (!planModal) return;
    try {
      await api.post(`/admin/set-plan?company_id=${planModal.id}&plan=${planType}&daily_limit=${planDailyLimit}&days=${planDays}`);
      setPlanModal(null);
      api.get('/admin/companies').then(setCompanies);
      setMessage(`Plan updated to "${planType}" for ${planModal.name}`);
    } catch (err) { setMessage(err.message); }
  };

  const toggleCat = (name) => {
    setSelectedCats((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);
  };
  const selectAllCats = () => {
    setSelectedCats(selectedCats.length === categoryOptions.length ? [] : categoryOptions.map((c) => c.name));
  };
  const selectUnscraped = () => {
    setSelectedCats(
      categoryOptions.filter((c) => !scrapedCombos.some((s) => s.city === scrapeCity && s.category === c.name)).map((c) => c.name)
    );
  };

  const handleScrape = async () => {
    if (!scrapeCity || selectedCats.length === 0) return;
    setScraping(true);
    try {
      for (const cat of selectedCats) {
        const result = await api.post('/admin/trigger-scrape', { city: scrapeCity, category: cat, source: scrapeSource });
        setScrapeJobs((prev) => [{ id: result.job_id, city: scrapeCity, category: cat, source: scrapeSource, status: 'queued', count: 0, saved: 0, error: null, started_at: new Date().toISOString(), finished_at: null }, ...prev]);
      }
      setSelectedCats([]);
    } catch (err) { setMessage(err.message); }
    finally { setScraping(false); }
  };

  const jobStatusBadge = (status) => {
    const styles = {
      queued: 'bg-gray-50 text-gray-600 ring-gray-400/20',
      running: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      completed: 'bg-green-50 text-green-700 ring-green-600/20',
      failed: 'bg-red-50 text-red-700 ring-red-600/20',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status] || ''}`}>
        {status === 'running' && (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
        )}
        {status === 'queued' && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {status}
      </span>
    );
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        tab === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  const filterSelect = (value, onChange, options, allLabel = 'All') => (
    <select
      value={value}
      onChange={onChange}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const searchInput = (value, onChange, placeholder = 'Search...') => (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">Manage companies, credits, scraping, and view all data</p>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-green-900 font-bold cursor-pointer">x</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabBtn('companies', 'Companies')}
        {tabBtn('credits', 'Add Credits')}
        {tabBtn('scrape', 'Trigger Scrape')}
        {tabBtn('transactions', 'Transactions')}
        {tabBtn('emails', 'All Emails')}
        {tabBtn('no-website', 'No Website')}
        {tabBtn('coverage', 'Coverage')}
      </div>

      {/* ── Companies ─────────────────────────────────── */}
      {tab === 'companies' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Batches</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {c.name}
                    {c.is_admin && <span className="ml-2 text-xs text-indigo-600">(admin)</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.email}</td>
                  <td className="px-6 py-4">
                    {c.is_admin ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">Admin</span>
                    ) : c.is_approved ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">Approved</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {c.plan === 'premium' ? (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-600/20 ring-inset">Premium</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-400/20 ring-inset">Free</span>
                    )}
                    {c.daily_send_limit > 0 && <span className="ml-1 text-xs text-gray-400">{c.daily_send_limit}/day</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{c.credit_balance.toFixed(0)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.batches_count}</td>
                  <td className="px-6 py-4 flex flex-wrap gap-2">
                    {!c.is_admin && !c.is_approved && (
                      <button onClick={() => handleApprove(c.id, c.name)} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 cursor-pointer">Approve</button>
                    )}
                    {!c.is_admin && c.is_approved && (
                      <button onClick={() => handleReject(c.id, c.name)} className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 cursor-pointer">Revoke</button>
                    )}
                    <button onClick={() => setCreditModal(c)} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 cursor-pointer">Credits</button>
                    <button onClick={() => { setPlanModal(c); setPlanType(c.plan === 'premium' ? 'free' : 'premium'); }} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 cursor-pointer">Plan</button>
                    {!c.is_admin && (
                      <button onClick={() => handleDeactivate(c.id, c.name)} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 cursor-pointer">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Credits ───────────────────────────────── */}
      {tab === 'credits' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add Credits to Company</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={creditModal?.id || ''}
                onChange={(e) => setCreditModal(companies.find((c) => c.id === Number(e.target.value)) || null)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white cursor-pointer"
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (bal: {c.credit_balance.toFixed(0)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" min={1} value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Reason for credit top-up" />
            </div>
            <button onClick={handleAddCredits} disabled={!creditModal || creditAmount <= 0} className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer">Add Credits</button>
          </div>
        </div>
      )}

      {/* ── Trigger Scrape ────────────────────────────── */}
      {tab === 'scrape' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Trigger Scrape Job</h3>
            <div className="space-y-5">
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'local.ch',       label: '🇨🇭 Switzerland (local.ch)' },
                    { value: 'gelbeseiten.de',  label: '🇩🇪 Germany (gelbeseiten.de)' },
                    { value: 'herold.at',       label: '🇦🇹 Austria (herold.at)' },
                    { value: 'proff.no',        label: '🇳🇴 Norway (proff.no)' },
                    { value: 'proff.dk',        label: '🇩🇰 Denmark (proff.dk)' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => { setScrapeSource(s.value); setScrapeCity(''); setSelectedCats([]); loadScrapeOptions(s.value); }}
                      className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        scrapeSource === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select a city on the map</label>
                <ScrapeMap
                  source={scrapeSource}
                  cities={scrapeCities}
                  scrapedCombos={scrapedCombos}
                  categoryCount={categoryOptions.length}
                  selectedCity={scrapeCity}
                  onSelectCity={(city) => { setScrapeCity(city); setSelectedCats([]); }}
                />
              </div>
              {scrapeCity && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Categories
                        {selectedCats.length > 0 && <span className="ml-2 text-indigo-600">({selectedCats.length} selected)</span>}
                      </label>
                      <div className="flex gap-2">
                        <button onClick={selectUnscraped} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer">Select unscraped</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={selectAllCats} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer">
                          {selectedCats.length === categoryOptions.length ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map((c) => {
                        const isScraped = scrapedCombos.some((s) => s.city === scrapeCity && s.category === c.name);
                        const isSelected = selectedCats.includes(c.name);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleCat(c.name)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : isScraped
                                  ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset hover:bg-green-100'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : isScraped ? (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            ) : null}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={handleScrape}
                    disabled={scraping || selectedCats.length === 0}
                    className="bg-indigo-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {scraping ? 'Starting jobs...' : `Scrape ${selectedCats.length} categor${selectedCats.length === 1 ? 'y' : 'ies'}`}
                  </button>
                </>
              )}
            </div>
          </div>
          {scrapeJobs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">Scrape Jobs</h4>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Job</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Results</th>
                    <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scrapeJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-xs font-mono text-gray-500">{j.id}</td>
                      <td className="px-6 py-3 text-xs">
                        {(() => {
                          const SOURCE_BADGE = {
                            'local.ch':       { label: '🇨🇭 CH', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
                            'gelbeseiten.de': { label: '🇩🇪 DE', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
                            'herold.at':      { label: '🇦🇹 AT', cls: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
                            'proff.no':       { label: '🇳🇴 NO', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
                            'proff.dk':       { label: '🇩🇰 DK', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
                          };
                          const b = SOURCE_BADGE[j.source] || SOURCE_BADGE['local.ch'];
                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${b.cls}`}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">{j.city}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{j.category}</td>
                      <td className="px-6 py-3">{jobStatusBadge(j.status)}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {j.status === 'completed' ? `${j.count} found, ${j.saved} new` : j.error ? j.error : '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-400">{new Date(j.started_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Transactions ──────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No transactions yet</td></tr>
              ) : transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{t.company_name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t.type === 'topup' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{t.type}</span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount >= 0 ? '+' : ''}{t.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── All Emails ────────────────────────────────── */}
      {tab === 'emails' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
              {filterSelect(emailCity, (e) => { setEmailCity(e.target.value); setEmailPage(1); }, filterCities, 'All Cities')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              {filterSelect(emailCat, (e) => { setEmailCat(e.target.value); setEmailPage(1); }, filterCats, 'All Categories')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              {searchInput(emailSearch, handleEmailSearch, 'Search by name or email...')}
            </div>
            <div className="text-sm text-gray-500 pb-1">
              <span className="font-medium text-gray-900">{emailTotal.toLocaleString()}</span> emails
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allEmails.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No emails found</td></tr>
                ) : allEmails.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{e.business_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{e.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{e.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{e.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={emailPage} setPage={setEmailPage} total={emailTotal} perPage={20} />
        </div>
      )}

      {/* ── No Website ────────────────────────────────── */}
      {tab === 'no-website' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
              {filterSelect(noWebCity, (e) => { setNoWebCity(e.target.value); setNoWebPage(1); }, filterCities, 'All Cities')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              {filterSelect(noWebCatFilter, (e) => { setNoWebCatFilter(e.target.value); setNoWebPage(1); }, filterCats, 'All Categories')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              {searchInput(noWebSearch, handleNoWebSearch, 'Search by name, email, phone...')}
            </div>
            <div className="text-sm text-gray-500 pb-1">
              <span className="font-medium text-gray-900">{noWebTotal.toLocaleString()}</span> businesses without a website
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Website</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {noWebBiz.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No businesses found</td></tr>
                ) : noWebBiz.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{b.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.category}</td>
                    <td className="px-6 py-4">
                      {!b.website ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">Missing</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">search.ch placeholder</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={noWebPage} setPage={setNoWebPage} total={noWebTotal} perPage={20} />
        </div>
      )}

      {/* ── Coverage ─────────────────────────────────── */}
      {tab === 'coverage' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'local.ch',      label: '🇨🇭 CH' },
                  { value: 'gelbeseiten.de', label: '🇩🇪 DE' },
                  { value: 'herold.at',      label: '🇦🇹 AT' },
                  { value: 'proff.no',       label: '🇳🇴 NO' },
                  { value: 'proff.dk',       label: '🇩🇰 DK' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setCoverageSource(s.value); loadCoverage(s.value); setCoverageCityFilter('all'); setCoverageCatFilter('all'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                      coverageSource === s.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {coverageData && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <select value={coverageCityFilter} onChange={(e) => setCoverageCityFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white cursor-pointer">
                    <option value="all">All Cities</option>
                    {[...new Set(coverageData.unscraped.map((u) => u.city))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select value={coverageCatFilter} onChange={(e) => setCoverageCatFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white cursor-pointer">
                    <option value="all">All Categories</option>
                    {[...new Set(coverageData.unscraped.map((u) => u.category))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {coverageData && (
            <>
              <div className="flex gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
                  <p className="text-2xl font-bold text-gray-900">{coverageData.total_combos.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total combos</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 px-6 py-4">
                  <p className="text-2xl font-bold text-green-600">{coverageData.scraped_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Scraped</p>
                </div>
                <div className="bg-white rounded-xl border border-red-200 px-6 py-4">
                  <p className="text-2xl font-bold text-red-600">{coverageData.unscraped_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Unscraped</p>
                </div>
                <div className="bg-white rounded-xl border border-indigo-200 px-6 py-4">
                  <p className="text-2xl font-bold text-indigo-600">{((coverageData.scraped_count / coverageData.total_combos) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Coverage</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Unscraped City / Category Combinations</h4>
                  <span className="text-xs text-gray-400">
                    {(() => {
                      const filtered = coverageData.unscraped.filter(
                        (u) => (coverageCityFilter === 'all' || u.city === coverageCityFilter) &&
                               (coverageCatFilter === 'all' || u.category === coverageCatFilter)
                      );
                      return `${filtered.length} shown`;
                    })()}
                  </span>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="text-left px-6 py-2.5 text-xs font-medium text-gray-500 uppercase">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coverageData.unscraped
                        .filter((u) => (coverageCityFilter === 'all' || u.city === coverageCityFilter) && (coverageCatFilter === 'all' || u.category === coverageCatFilter))
                        .slice(0, 200)
                        .map((u, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-2.5 text-sm text-gray-900">{u.city}</td>
                            <td className="px-6 py-2.5 text-sm text-gray-900">{u.category}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Plan Modal ────────────── */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Set Plan</h3>
            <p className="text-sm text-gray-500 mb-4">Company: <span className="font-medium text-gray-900">{planModal.name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={planType} onChange={(e) => setPlanType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white cursor-pointer">
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              {planType === 'premium' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                    <input type="number" min={1} value={planDays} onChange={(e) => setPlanDays(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily email send limit</label>
                    <input type="number" min={1} value={planDailyLimit} onChange={(e) => setPlanDailyLimit(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPlanModal(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleSetPlan} className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-purple-700 cursor-pointer">Save Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credit Modal ─────────── */}
      {creditModal && tab === 'companies' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Credits</h3>
            <p className="text-sm text-gray-500 mb-4">Company: <span className="font-medium text-gray-900">{creditModal.name}</span></p>
            <div className="space-y-3">
              <input type="number" min={1} value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Amount" />
              <input type="text" value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" placeholder="Description (optional)" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCreditModal(null); setCreditAmount(0); setCreditDesc(''); }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={handleAddCredits} disabled={creditAmount <= 0} className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer">Add Credits</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
