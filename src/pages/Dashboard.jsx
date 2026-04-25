import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function StatCard({ title, value, subtitle, icon, color = 'gray' }) {
  const palette = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-200',
    green: 'bg-green-50 text-green-600 ring-green-200',
    blue: 'bg-blue-50 text-blue-600 ring-blue-200',
    amber: 'bg-amber-50 text-amber-600 ring-amber-200',
    red: 'bg-red-50 text-red-600 ring-red-200',
    purple: 'bg-purple-50 text-purple-600 ring-purple-200',
    gray: 'bg-gray-50 text-gray-600 ring-gray-200',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    cyan: 'bg-cyan-50 text-cyan-600 ring-cyan-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg ${palette[color]} flex items-center justify-center text-lg flex-shrink-0 ring-1`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, label, description, icon, primary }) {
  return (
    <Link
      to={to}
      className={`rounded-xl p-5 flex items-center gap-4 transition-all hover:shadow-md ${
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-white text-gray-800 border border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
        primary ? 'bg-white/20' : 'bg-gray-100'
      }`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${primary ? 'text-indigo-200' : 'text-gray-400'}`}>{description}</p>
      </div>
    </Link>
  );
}

function BreakdownTable({ title, icon, data, searchPlaceholder }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState('');

  if (!data || data.length === 0) return null;

  const filtered = search
    ? data.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : data;

  const totalBiz = data.reduce((s, d) => s + d.total, 0);
  const totalEmails = data.reduce((s, d) => s + d.with_email, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400">{data.length} entries — {totalBiz.toLocaleString()} businesses — {totalEmails.toLocaleString()} emails</p>
          </div>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-200">
          {data.length > 8 && (
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={searchPlaceholder}
                />
              </div>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-gray-500 uppercase">Businesses</th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-gray-500 uppercase">Emails</th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-gray-500 uppercase w-32">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.with_email / d.total) * 100) : 0;
                  return (
                    <tr key={d.name} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-sm text-gray-900">{d.name}</td>
                      <td className="px-5 py-2.5 text-sm text-gray-500 text-right">{d.total.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-sm text-gray-900 font-medium text-right">{d.with_email.toLocaleString()}</td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">No matches</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  const isApproved = company?.is_approved || company?.is_admin;

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats').catch(() => null),
      isApproved ? api.get('/dashboard/breakdown').catch(() => null) : Promise.resolve(null),
    ]).then(([s, b]) => {
      setStats(s);
      setBreakdown(b);
    }).finally(() => setLoading(false));
  }, [isApproved]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;

  if (!isApproved) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome, {company?.name}</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-10 text-center">
          <div className="text-5xl mb-4">&#9203;</div>
          <h2 className="text-xl font-bold text-amber-800 mb-2">Account Pending Approval</h2>
          <p className="text-amber-700 max-w-md mx-auto">
            Your account has been registered successfully. An administrator needs to approve your account before you can access the platform features.
          </p>
          <p className="text-sm text-amber-600 mt-4">
            You will gain access to Browse Emails, Batches, Send Emails, and Sent History once approved.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="text-center py-20 text-red-500">Failed to load stats</div>;

  const sendRate = stats.emails_sent + stats.emails_failed > 0
    ? ((stats.emails_sent / (stats.emails_sent + stats.emails_failed)) * 100).toFixed(0)
    : null;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {company?.name}</p>
        </div>
        {!stats.smtp_configured && (
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Set up SMTP to send emails
          </Link>
        )}
      </div>

      {/* Your Account */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Account</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Batches" value={stats.batches_count} icon="📦" color="blue" />
          <StatCard title="Batch Emails" value={stats.emails_purchased.toLocaleString()} subtitle="emails in batches" icon="🛒" color="green" />
          <StatCard title="Sent" value={stats.emails_sent.toLocaleString()} subtitle={sendRate ? `${sendRate}% success rate` : ''} icon="✅" color="emerald" />
          <StatCard title="Failed" value={stats.emails_failed.toLocaleString()} icon="❌" color="red" />
        </div>
      </div>

      {/* Platform Data */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Platform Data</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Businesses" value={stats.total_businesses.toLocaleString()} icon="🏢" color="gray" />
          <StatCard title="Emails" value={stats.total_emails_available.toLocaleString()} subtitle="with valid email" icon="📧" color="indigo" />
          <StatCard title="With Website" value={stats.total_with_website.toLocaleString()} icon="🌐" color="cyan" />
          <StatCard title="No Website" value={stats.total_without_website.toLocaleString()} icon="🚫" color="amber" />
          <StatCard title="Categories" value={stats.total_categories} icon="📂" color="purple" />
          <StatCard title="Cities" value={stats.total_cities} icon="🏙️" color="blue" />
        </div>
      </div>

      {/* Breakdowns */}
      {breakdown && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Breakdown</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable
              title="By Category"
              icon="📂"
              data={breakdown.categories}
              searchPlaceholder="Search categories..."
            />
            <BreakdownTable
              title="By City"
              icon="🏙️"
              data={breakdown.cities}
              searchPlaceholder="Search cities..."
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction to="/browse" label="Browse Emails" description="Find & create lead batches" icon="🔍" primary />
          <QuickAction to="/send" label="Send Emails" description="Compose & send to leads" icon="✉️" />
          <QuickAction to="/batches" label="My Batches" description="View created batches" icon="📦" />
          <QuickAction to="/settings" label="SMTP Settings" description="Configure email sending" icon="⚙️" />
        </div>
      </div>
    </div>
  );
}
