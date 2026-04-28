import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { api } from '../api';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote'],
    ['link', 'image'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align',
  'list', 'blockquote', 'link', 'image',
];

const SAFE_BATCH_SELECTION_SIZE = 20;

const formatFailedRecipients = (failed) => {
  return failed.map((item) => {
    return item.error ? `${item.email}: ${item.error}` : item.email;
  }).join('; ');
};

export default function SendEmails() {
  const location = useLocation();
  const [mode, setMode] = useState('batch');
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(location.state?.batchId || '');
  const [batchEmails, setBatchEmails] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualEmails, setManualEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  useEffect(() => {
    api.get('/dashboard/my-batches').then(setBatches);
  }, []);

  const selectNextSafeBatch = useCallback((emails) => {
    setSelectedIds(emails.slice(0, SAFE_BATCH_SELECTION_SIZE).map((e) => e.id));
  }, []);

  const loadBatchEmails = useCallback(async (batchId) => {
    const emails = await api.get(`/dashboard/my-batches/${batchId}/emails`);
    setBatchEmails(emails);
    selectNextSafeBatch(emails);
  }, [selectNextSafeBatch]);

  useEffect(() => {
    if (selectedBatch) {
      loadBatchEmails(selectedBatch);
    } else {
      setBatchEmails([]);
      setSelectedIds([]);
    }
  }, [selectedBatch, loadBatchEmails]);

  const toggleId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === batchEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(batchEmails.map((e) => e.id));
    }
  };

  const parsedManualEmails = useMemo(() => {
    return manualEmails.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => e && e.includes('@'));
  }, [manualEmails]);

  const handleSend = async () => {
    setSending(true);
    setMessage('');
    try {
      if (mode === 'manual') {
        const result = await api.post('/dashboard/send-manual', {
          emails: parsedManualEmails,
          subject,
          body,
        });
        const failed = result.results.filter((r) => r.status === 'failed');
        if (failed.length > 0) {
          setMessage(`Sent ${result.sent}/${result.total}. Failed: ${formatFailedRecipients(failed)}`);
        } else {
          setMessage(`Sent ${result.sent} email(s) successfully!`);
          setSubject('');
          setBody('');
          setShowPreview(false);
        }
      } else {
        const result = await api.post('/dashboard/send-email', {
          batch_email_ids: selectedIds,
          subject,
          body,
        });
        setMessage(`Queued ${result.queued} email(s). Sending one every ${result.delay_seconds || 5} seconds.`);
        if (selectedBatch) {
          await loadBatchEmails(selectedBatch);
        }
        setSubject('');
        setBody('');
        setShowPreview(false);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  const isBodyEmpty = useMemo(() => {
    const stripped = body.replace(/<[^>]*>/g, '').trim();
    return !stripped;
  }, [body]);

  const canSend = subject && !isBodyEmpty && (mode === 'batch' ? selectedIds.length > 0 : parsedManualEmails.length > 0);
  const recipientCount = mode === 'batch' ? selectedIds.length : parsedManualEmails.length;

  const firstRecipient = batchEmails.find((e) => selectedIds.includes(e.id));
  const messageIsSuccess = message.includes('Queued') || message.includes('successfully');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Emails</h1>
        <p className="text-gray-500 mt-1">Compose and send emails to your leads</p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${messageIsSuccess ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message}
          <button onClick={() => setMessage('')} className="ml-2 font-bold cursor-pointer">x</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Mode toggle + Recipients */}
        <div className="space-y-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('batch')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                mode === 'batch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              From Batch
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual Emails
            </button>
          </div>

          {mode === 'batch' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Choose a batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch #{b.id} — {b.category_name} ({b.batch_size} emails)
                    </option>
                  ))}
                </select>
              </div>

              {batchEmails.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === batchEmails.length}
                          onChange={toggleAll}
                          className="rounded cursor-pointer"
                        />
                        Select All
                      </label>
                      <button
                        type="button"
                        onClick={() => selectNextSafeBatch(batchEmails)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Select next {SAFE_BATCH_SELECTION_SIZE}
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-medium text-indigo-600">{selectedIds.length}/{batchEmails.length}</span>
                      <span className="block text-[11px] text-gray-400">unsent recipients</span>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {batchEmails.map((e) => (
                      <label key={e.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(e.id)}
                          onChange={() => toggleId(e.id)}
                          className="rounded cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">{e.business_name}</p>
                          <p className="text-xs text-gray-400 font-mono truncate">{e.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Addresses
                {parsedManualEmails.length > 0 && (
                  <span className="ml-2 text-indigo-600 font-normal">({parsedManualEmails.length} valid)</span>
                )}
              </label>
              <textarea
                value={manualEmails}
                onChange={(e) => setManualEmails(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={"test@example.com\nclient@company.com\nsales@business.ch"}
              />
              <p className="text-xs text-gray-400 mt-1.5">One email per line, or separate with commas</p>
            </div>
          )}
        </div>

        {/* Right: Compose */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Email subject line..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <div className="rounded-lg border border-gray-300 overflow-hidden bg-white [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 [&_.ql-toolbar]:bg-gray-50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[240px] [&_.ql-editor]:text-sm [&_.ql-editor]:leading-relaxed">
              <ReactQuill
                theme="snow"
                value={body}
                onChange={setBody}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Write your email content here..."
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!canSend}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Email
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !canSend}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send to {recipientCount} recipient(s)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Email Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-gray-100 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Email Preview</h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {[
                    { key: 'desktop', label: 'Desktop', icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )},
                    { key: 'mobile', label: 'Mobile', icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )},
                  ].map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setPreviewDevice(d.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        previewDevice === d.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {d.icon}
                      {d.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center">
              <div
                className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
                }`}
              >
                {/* Email header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0 mt-0.5">
                      You
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{subject || '(No subject)'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        To: {mode === 'manual' ? (
                          <>
                            <span className="text-gray-700">{parsedManualEmails[0]}</span>
                            {parsedManualEmails.length > 1 && (
                              <span className="text-gray-400 ml-1">and {parsedManualEmails.length - 1} more</span>
                            )}
                          </>
                        ) : firstRecipient ? (
                          <>
                            <span className="text-gray-700">{firstRecipient.business_name} &lt;{firstRecipient.email}&gt;</span>
                            {selectedIds.length > 1 && (
                              <span className="text-gray-400 ml-1">and {selectedIds.length - 1} more</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">No recipients selected</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email body */}
                <div
                  className="px-6 py-6 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none
                    [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3
                    [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2
                    [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2
                    [&_p]:mb-3 [&_p]:leading-relaxed
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                    [&_li]:mb-1
                    [&_a]:text-indigo-600 [&_a]:underline
                    [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-3
                    [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3"
                  dangerouslySetInnerHTML={{ __html: body || '<p style="color:#9ca3af">Your email content will appear here...</p>' }}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Sending to <span className="font-medium text-gray-700">{recipientCount}</span> recipient(s)
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setShowPreview(false); handleSend(); }}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
