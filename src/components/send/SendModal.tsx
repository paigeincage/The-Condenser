import { useEffect, useState } from 'react';
import { X, Mail, MessageCircle, Copy, Download, Share2 } from 'lucide-react';
import { listContacts } from '../../api/contacts';
import { sendEmail, sendText, copyToClipboard, downloadAsFile, nativeShare } from '../../services/communication';
import { useUI } from '../../stores/ui';
import type { PunchItem, Contact } from '../../types';

interface SendModalProps {
  items: PunchItem[];
  projectAddress: string;
  onClose: () => void;
}

function formatPunchList(items: PunchItem[], trade: string, address: string): string {
  const lines: string[] = [
    `PUNCH LIST — ${trade}`,
    `Project: ${address}`,
    `Date: ${new Date().toLocaleDateString()}`,
    `Items: ${items.length}`,
    '',
    '─'.repeat(40),
    '',
  ];
  items.forEach((item, i) => {
    const priority = item.priority !== 'normal' ? ` [${item.priority.toUpperCase()}]` : '';
    const location = item.location ? ` (${item.location})` : '';
    lines.push(`${i + 1}. ${item.text}${location}${priority}`);
    if (item.notes) lines.push(`   Note: ${item.notes}`);
  });
  lines.push('', '─'.repeat(40));
  lines.push('', 'Please confirm completion or reply with questions.');
  return lines.join('\n');
}

export function SendModal({ items, projectAddress, onClose }: SendModalProps) {
  const addToast = useUI((s) => s.addToast);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [preview, setPreview] = useState('');

  const trades = [...new Set(items.map((i) => i.trade || 'Uncategorized'))].sort();

  useEffect(() => {
    listContacts().then((r) => setContacts(r.contacts)).catch(() => {});
  }, []);

  useEffect(() => {
    if (trades.length > 0 && !selectedTrade) setSelectedTrade(trades[0]!);
  }, [trades]);

  useEffect(() => {
    if (!selectedTrade || manualMode) return;
    const match = contacts.find((c) => c.trade.toLowerCase() === selectedTrade.toLowerCase());
    setSelectedContact(match || null);
  }, [selectedTrade, contacts, manualMode]);

  useEffect(() => {
    if (!selectedTrade) return;
    const tradeItems = items.filter((i) => (i.trade || 'Uncategorized') === selectedTrade);
    setPreview(formatPunchList(tradeItems, selectedTrade, projectAddress));
  }, [selectedTrade, items, projectAddress]);

  const tradeItems = items.filter((i) => (i.trade || 'Uncategorized') === selectedTrade);
  const subject = `Punch List — ${selectedTrade} — ${projectAddress}`;

  const recipientEmail = manualMode ? manualEmail.trim() : selectedContact?.email || '';
  const recipientPhone = manualMode ? manualPhone.trim() : selectedContact?.phone || '';

  const handleSendEmail = () => {
    if (manualMode && !recipientEmail) {
      addToast('Enter an email address for the recipient', 'error');
      return;
    }
    sendEmail(recipientEmail, subject, preview);
    addToast(`Opening email for ${selectedTrade}`, 'success');
  };
  const handleSendText = () => {
    if (!recipientPhone) {
      addToast('No phone number — pick a contact or enter one manually', 'error');
      return;
    }
    sendText(recipientPhone, preview);
    addToast(`Opening text for ${selectedTrade}`, 'success');
  };
  const handleCopy = async () => {
    const ok = await copyToClipboard(preview);
    addToast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
  };
  const handleDownload = () => {
    const filename = `punch-list-${selectedTrade.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    downloadAsFile(preview, filename);
    addToast('Downloaded', 'success');
  };
  const handleShare = async () => {
    const ok = await nativeShare(subject, preview);
    if (!ok) handleCopy();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border-2 border-[var(--border)] w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 border-b border-[var(--border)] flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-[var(--text)]">
              Send Punch List
            </h3>
            <p className="text-xs text-[var(--text-3)] mt-1 font-mono uppercase tracking-wider">
              {projectAddress}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-2">
              Select Trade
            </div>
            <div className="flex flex-wrap gap-2">
              {trades.map((trade) => {
                const count = items.filter((i) => (i.trade || 'Uncategorized') === trade).length;
                const active = selectedTrade === trade;
                return (
                  <button
                    key={trade}
                    onClick={() => setSelectedTrade(trade)}
                    className={`text-xs px-3 py-2 rounded-full font-bold uppercase tracking-wider border-2 transition-colors ${
                      active
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--card-2)] border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent-glow)]'
                    }`}
                  >
                    {trade}
                    <span className="ml-1.5 font-mono opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-2">
              Send To
            </div>
            {manualMode ? (
              <div className="bg-[var(--card-2)] border border-[var(--border)] rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">Someone else</p>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm"
                />
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone number (for text)"
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm"
                />
              </div>
            ) : selectedContact ? (
              <div className="bg-[var(--card-2)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{selectedContact.name}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {selectedContact.company}
                    {selectedContact.company && ' · '}
                    {selectedContact.preferredChannel === 'text' ? selectedContact.phone : selectedContact.email}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                    selectedContact.preferredChannel === 'both'
                      ? 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent-tint-2)]'
                      : selectedContact.preferredChannel === 'text'
                        ? 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/30'
                        : 'bg-[var(--card)] text-[var(--text-2)] border-[var(--border)]'
                  }`}
                >
                  {selectedContact.preferredChannel}
                </span>
              </div>
            ) : (
              <div className="bg-[var(--card-2)] border border-[var(--border)] rounded-xl p-3">
                <p className="text-sm text-[var(--text-2)]">No contact matched for "{selectedTrade}"</p>
                <p className="text-xs text-[var(--text-3)] mt-1">Pick a contact below or choose "Someone else" to enter a recipient.</p>
              </div>
            )}

            <select
              className="mt-2 w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm"
              value={manualMode ? '__manual__' : selectedContact?.id || ''}
              onChange={(e) => {
                if (e.target.value === '__manual__') {
                  setManualMode(true);
                  setSelectedContact(null);
                  return;
                }
                setManualMode(false);
                const c = contacts.find((c) => c.id === e.target.value);
                setSelectedContact(c || null);
              }}
            >
              <option value="">Choose a different contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.trade || 'No trade'}
                </option>
              ))}
              <option value="__manual__">Someone else (enter manually)…</option>
            </select>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-2">
              Preview <span className="font-mono">({tradeItems.length})</span>
            </div>
            <pre className="bg-[var(--card-2)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text-2)] whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
              {preview}
            </pre>
          </div>
        </div>

        <div className="p-5 pt-3 border-t border-[var(--border)] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleSendEmail} className="app-btn-primary">
              <Mail size={16} strokeWidth={2.5} />
              Email
            </button>
            <button onClick={handleSendText} className="app-btn-primary">
              <MessageCircle size={16} strokeWidth={2.5} />
              Text
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleCopy} className="app-btn-ghost text-xs py-2">
              <Copy size={12} strokeWidth={2.5} />
              Copy
            </button>
            <button onClick={handleDownload} className="app-btn-ghost text-xs py-2">
              <Download size={12} strokeWidth={2.5} />
              Download
            </button>
            <button onClick={handleShare} className="app-btn-ghost text-xs py-2">
              <Share2 size={12} strokeWidth={2.5} />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
