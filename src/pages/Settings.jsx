import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587, note: 'Use an App Password, not your Gmail password' },
  { label: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', port: 587, note: '' },
  { label: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, note: 'Generate an App Password in Yahoo security settings' },
  { label: 'Custom', host: '', port: 587, note: '' },
];

export default function Settings() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activePreset, setActivePreset] = useState('Custom');

  useEffect(() => {
    api.get('/dashboard/smtp-settings')
      .then((data) => {
        setHost(data.smtp_host || '');
        setPort(data.smtp_port || 587);
        setUser(data.smtp_user || '');
        setFromEmail(data.smtp_from_email || '');
        setFromName(data.smtp_from_name || '');
        setEnabled(data.smtp_enabled);
        setHasPassword(data.has_password);
        setTestEmail(company?.email || '');

        const match = PRESETS.find((p) => p.host === data.smtp_host);
        setActivePreset(match ? match.label : 'Custom');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [company]);

  const handlePreset = (preset) => {
    setActivePreset(preset.label);
    if (preset.host) {
      setHost(preset.host);
      setPort(preset.port);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = await api.put('/dashboard/smtp-settings', {
        smtp_host: host,
        smtp_port: port,
        smtp_user: user,
        smtp_pass: pass,
        smtp_from_email: fromEmail || user,
        smtp_from_name: fromName,
        smtp_enabled: enabled,
      });
      setHasPassword(data.has_password);
      setPass('');
      setMessage({ type: 'success', text: 'SMTP settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    setMessage(null);
    try {
      const data = await api.post('/dashboard/smtp-test', { to_email: testEmail });
      setMessage({ type: 'success', text: data.detail });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading settings...</div>;

  const currentPreset = PRESETS.find((p) => p.label === activePreset);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your SMTP email settings to send emails through your own address</p>
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm border ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">SMTP Configuration</h2>
              <p className="text-xs text-gray-500">All emails will be sent from your configured email</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">{enabled ? 'Enabled' : 'Disabled'}</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                enabled ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </label>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Provider</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    activePreset === p.label
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {currentPreset?.note && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                {currentPreset.note}
              </p>
            )}
          </div>

          {/* SMTP Host + Port */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Password
                {hasPassword && !pass && (
                  <span className="ml-2 text-xs text-green-600 font-normal">saved</span>
                )}
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={hasPassword ? '••••••••  (leave blank to keep)' : 'App password or SMTP password'}
              />
            </div>
          </div>

          {/* From fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Same as username if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={company?.name || 'Your Company Name'}
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !host || !user}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>

        {/* Test section */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Send Test Email</label>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your@email.com"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testEmail || !hasPassword}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              {testing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Test
                </>
              )}
            </button>
          </div>
          {!hasPassword && (
            <p className="text-xs text-gray-400 mt-2">Save your settings first before sending a test email.</p>
          )}
        </div>
      </div>
    </div>
  );
}
