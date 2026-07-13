import { useEffect, useState } from 'react';
import { Search, Plus, Upload, Pencil, Trash2, Mail, Phone, X } from 'lucide-react';
import { listContacts, createContact, updateContact, deleteContact } from '../api/contacts';
import { TopBar } from '../components/layout/TopBar';
import { ImportModal } from '../components/contacts/ImportModal';
import { useUI } from '../stores/ui';
import type { Contact } from '../types';

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm';

type Preference = 'email' | 'text' | 'both';

export function Contacts() {
  const addToast = useUI((s) => s.addToast);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    company: string;
    trade: string;
    preferredChannel: Preference;
  }>({ name: '', email: '', phone: '', company: '', trade: '', preferredChannel: 'email' });

  const load = () => {
    listContacts(search || undefined)
      .then((r) => setContacts(r.contacts))
      .catch(() => {});
  };

  useEffect(load, [search]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', company: '', trade: '', preferredChannel: 'email' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateContact(editing.id, form);
        addToast('Contact updated', 'success');
      } else {
        await createContact(form);
        addToast('Contact added', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  const handleEdit = (c: Contact) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      trade: c.trade,
      preferredChannel: (c.preferredChannel as Preference) ?? 'email',
    });
    setEditing(c);
    setShowForm(true);
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Remove ${c.name}?`)) return;
    try {
      await deleteContact(c.id);
      addToast('Contact deleted', 'success');
      load();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  const setChannel = async (c: Contact, pref: Preference) => {
    if (c.preferredChannel === pref) return;
    setContacts((prev) => prev.map((x) => (x.id === c.id ? { ...x, preferredChannel: pref } : x)));
    try {
      await updateContact(c.id, { preferredChannel: pref });
    } catch {
      addToast('Failed to update', 'error');
      load();
    }
  };

  return (
    <div className="pb-8">
      <TopBar
        title="Contacts"
        back
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              aria-label="Import CSV"
              className="w-9 h-9 rounded-lg bg-[var(--card-2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent-glow)] transition-colors"
            >
              <Upload size={16} strokeWidth={2} />
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="app-btn-primary text-sm py-2 px-3"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add
            </button>
          </div>
        }
      />

      <div className="relative mb-4">
        <Search
          size={16}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className={`${INPUT_CLASS} pl-10`}
        />
      </div>

      {showForm && (
        <div className="app-card mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text)]">
              {editing ? 'Edit contact' : 'New contact'}
            </h3>
            <button onClick={resetForm} className="text-[var(--text-3)] hover:text-[var(--text)]">
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name *"
            className={INPUT_CLASS}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className={INPUT_CLASS}
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className={INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company"
              className={INPUT_CLASS}
            />
            <input
              type="text"
              value={form.trade}
              onChange={(e) => setForm({ ...form, trade: e.target.value })}
              placeholder="Trade"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-2">
              Send preference
            </div>
            <div className="flex gap-2">
              {(['text', 'email', 'both'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, preferredChannel: p })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                    form.preferredChannel === p
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--card-2)] text-[var(--text-2)] border-[var(--border)] hover:border-[var(--accent-glow)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={resetForm} className="app-btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="app-btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2.5">
        {contacts.length === 0 ? (
          <div className="app-card text-center py-8 lg:col-span-2">
            <p className="text-sm font-semibold text-[var(--text-2)]">No contacts yet</p>
            <p className="text-xs text-[var(--text-3)] mt-1">Add one above or import a CSV.</p>
          </div>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="app-card !p-3 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 font-display uppercase"
                style={{
                  background: 'var(--accent-tint)',
                  color: 'var(--accent)',
                  border: '1.5px solid var(--accent-tint-2)',
                }}
              >
                {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-[var(--text)] truncate text-sm">{c.name}</p>
                  <div className="flex gap-0.5 shrink-0 bg-[var(--card-2)] rounded-full p-0.5 border border-[var(--border)]">
                    {(['text', 'email', 'both'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChannel(c, p)}
                        aria-label={`Send preference: ${p}`}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          c.preferredChannel === p
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-3)] hover:text-[var(--text)]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-3)] truncate">
                  {c.company}
                  {c.trade ? ` · ${c.trade}` : ''}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-3)]">
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={10} strokeWidth={2} />
                      <span className="truncate max-w-[140px]">{c.email}</span>
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={10} strokeWidth={2} />
                      {c.phone}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleEdit(c)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                  >
                    <Pencil size={10} strokeWidth={2.5} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--red)] hover:underline"
                  >
                    <Trash2 size={10} strokeWidth={2.5} />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={load} />}
    </div>
  );
}
