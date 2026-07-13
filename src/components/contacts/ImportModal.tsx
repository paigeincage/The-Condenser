import { useState, useRef } from 'react';
import { Upload, X, Loader2, Smartphone } from 'lucide-react';
import { apiUpload, api } from '../../api/client';
import { useUI } from '../../stores/ui';

interface ParsedContact {
  name: string;
  email: string;
  phone: string;
  company: string;
  trade: string;
}

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const addToast = useUI((s) => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiUpload<{ contacts: ParsedContact[]; count: number }>(
        '/api/contacts/import',
        form
      );
      setParsed(result.contacts);
      addToast(`Found ${result.count} contacts`, 'success');
    } catch (err) {
      addToast(`Import failed: ${err}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Contact Picker API — lets users tap contacts from their phone (Android Chrome).
  const canPickPhone =
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as { contacts?: { select?: unknown } }).contacts?.select === 'function';

  const pickFromPhone = async () => {
    try {
      const nav = navigator as unknown as {
        contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }>> };
      };
      const selected = await nav.contacts.select(['name', 'email', 'tel'], { multiple: true });
      const mapped: ParsedContact[] = selected
        .map((c) => ({
          name: c.name?.[0] || '',
          email: c.email?.[0] || '',
          phone: c.tel?.[0] || '',
          company: '',
          trade: '',
        }))
        .filter((c) => c.name);
      if (mapped.length === 0) {
        addToast('No contacts selected', 'info');
        return;
      }
      setParsed(mapped);
      addToast(`Selected ${mapped.length} contact${mapped.length === 1 ? '' : 's'}`, 'success');
    } catch {
      addToast('Contact picker was cancelled or unavailable', 'info');
    }
  };

  const handleConfirm = async () => {
    setImporting(true);
    try {
      const result = await api<{ imported: number }>('/api/contacts/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ contacts: parsed }),
      });
      addToast(`Imported ${result.imported} contacts`, 'success');
      onImported();
      onClose();
    } catch (err) {
      addToast(`Save failed: ${err}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const removeContact = (index: number) => {
    setParsed((p) => p.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof ParsedContact, value: string) => {
    setParsed((p) => p.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const fieldCls =
    'text-xs text-[var(--text-2)] bg-transparent focus:outline-none focus-visible:border-b focus-visible:border-[var(--accent)] placeholder:text-[var(--text-4)]';

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
              Import Contacts
            </h3>
            <p className="text-xs text-[var(--text-3)] mt-1">
              Upload a file to bulk-import contacts
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {parsed.length === 0 ? (
            <>
              <div
                className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--accent-glow)] hover:bg-[var(--accent-tint)] transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <div>
                    <Loader2
                      size={32}
                      className="animate-spin mx-auto mb-3 text-[var(--accent)]"
                      strokeWidth={2}
                    />
                    <p className="text-sm text-[var(--text-2)] font-semibold">Reading file…</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--card-2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                      <Upload size={22} strokeWidth={2} />
                    </div>
                    <p className="font-display text-base font-bold uppercase tracking-tight text-[var(--text)] mb-1">
                      Tap to select file
                    </p>
                    <p className="text-xs text-[var(--text-3)]">PDF · Excel · CSV · phone contacts (.vcf)</p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.vcf,.csv,.tsv,.txt,.xlsx,.xlsm,.xls,.ods,.numbers"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {canPickPhone && (
                <button
                  onClick={pickFromPhone}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--accent)] text-[var(--accent)] font-bold text-sm hover:bg-[var(--accent-tint)] transition-colors"
                >
                  <Smartphone size={16} strokeWidth={2.5} />
                  Pick from my phone
                </button>
              )}

              <div className="app-card !p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
                  Quick ways to get contacts here
                </p>
                <div className="space-y-1.5 text-xs text-[var(--text-2)] leading-relaxed">
                  <p>
                    <strong className="text-[var(--text)]">From your phone:</strong> Open a contact → Share →
                    Save as .vcf → Upload here. Multiple contacts can go in one file.
                  </p>
                  <p>
                    <strong className="text-[var(--text)]">From Outlook:</strong> Select contacts → Export to
                    CSV → Upload here.
                  </p>
                  <p>
                    <strong className="text-[var(--text)]">From a spreadsheet:</strong> Columns should include
                    Name, Email, Phone, Company, Trade → Save as .xlsx or .csv → Upload.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-[var(--text)]">
                <span className="font-mono text-[var(--accent)]">{parsed.length}</span> contacts ready to
                import
              </p>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {parsed.map((c, i) => (
                  <div key={i} className="bg-[var(--card-2)] border border-[var(--border)] rounded-lg p-3 relative">
                    <button
                      onClick={() => removeContact(i)}
                      className="absolute top-2 right-2 text-[var(--text-4)] hover:text-[var(--red)]"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                    <input
                      className="text-sm font-bold text-[var(--text)] bg-transparent w-full focus:outline-none focus-visible:border-b focus-visible:border-[var(--accent)]"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      <input
                        className={fieldCls}
                        value={c.email}
                        onChange={(e) => updateContact(i, 'email', e.target.value)}
                        placeholder="email"
                      />
                      <input
                        className={fieldCls}
                        value={c.phone}
                        onChange={(e) => updateContact(i, 'phone', e.target.value)}
                        placeholder="phone"
                      />
                      <input
                        className={fieldCls}
                        value={c.company}
                        onChange={(e) => updateContact(i, 'company', e.target.value)}
                        placeholder="company"
                      />
                      <input
                        className={fieldCls}
                        value={c.trade}
                        onChange={(e) => updateContact(i, 'trade', e.target.value)}
                        placeholder="trade"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5 pt-3 border-t border-[var(--border)] space-y-2">
          {parsed.length > 0 ? (
            <div className="flex gap-2">
              <button onClick={() => setParsed([])} className="app-btn-ghost flex-1">
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || parsed.length === 0}
                className="app-btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing…' : `Import ${parsed.length}`}
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="app-btn-ghost w-full">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
