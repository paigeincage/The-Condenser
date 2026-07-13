import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Send, Plus, X, AlertCircle, FileText, Check, Mic, Camera,
  Loader2, Search, MapPin, Zap, Pencil, Copy, Trash2, SlidersHorizontal, Settings, ListPlus,
} from 'lucide-react';
import { getProject, updateProject } from '../api/projects';
import { updateItem, deleteItem, createItemsBulk, saveTradeSteps } from '../api/items';
import { listContacts } from '../api/contacts';
import { uploadFiles, extractFile } from '../api/files';
import { TopBar } from '../components/layout/TopBar';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { SendModal } from '../components/send/SendModal';
import { PhotoAttachments } from '../components/items/PhotoAttachments';
import { VoiceCapture } from '../components/voice/VoiceCapture';
import { useUI } from '../stores/ui';
import { BUILD_STAGES } from '../types';
import type { Project as ProjectType, PunchItem, Contact } from '../types';

const TRADES = [
  'Painting & Touch-Up', 'Trim / Baseboard / Caulk', 'Stairs / Flooring', 'Plumbing',
  'HVAC', 'Door Hardware', 'Drywall', 'Concrete', 'Framing / Siding', 'Windows',
  'Garage', 'Garage Door', 'General Cleaning', 'Landscaping / Irrigation', 'Gutters',
  'Electrical', 'Roofing', 'Insulation', 'Appliances', 'Cabinets / Countertops',
  'Masonry / Stone', 'Mirrors / Shower Glass', 'Stucco / Plastering', 'Fencing',
  'Pest Control', 'Uncategorized',
];

type Filter = 'all' | 'pending' | 'wip' | 'done';
type GroupBy = 'trade' | 'room' | 'priority';
type SourceFilter = 'all' | 'spec' | 'conf';

const PRIORITY_RANK: Record<string, number> = { Priority: 0, Elevated: 1, Standard: 2 };

function sourceLabel(source: string): string | null {
  const s = (source || '').toLowerCase();
  if (s.includes('spec')) return 'Spec Checklist';
  if (s.includes('conf')) return 'Confirmation';
  if (!source || s === 'manual') return null;
  return source;
}

export function Project() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const addToast = useUI((s) => s.addToast);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('trade');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<PunchItem | null>(null);
  const [stepsItem, setStepsItem] = useState<PunchItem | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [sendItems, setSendItems] = useState<PunchItem[] | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [cameraUploading, setCameraUploading] = useState(false);
  const [quickAdd, setQuickAdd] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!id) return;
    getProject(id)
      .then((r) => setProject(r.project))
      .catch(() => addToast('Failed to load project', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  // ⌘K → focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading)
    return (
      <div className="text-center py-20 text-[var(--text-3)] text-sm">Loading…</div>
    );
  if (!project)
    return (
      <div className="text-center py-20 text-[var(--text-3)] text-sm">Project not found</div>
    );

  const allItems = project.items || [];

  const statusCounts = {
    all: allItems.length,
    pending: allItems.filter((i) => i.status === 'pending').length,
    wip: allItems.filter((i) => i.status === 'wip').length,
    done: allItems.filter((i) => i.status === 'done').length,
  };
  const sourceCounts = {
    all: allItems.length,
    spec: allItems.filter((i) => sourceLabel(i.source) === 'Spec Checklist').length,
    conf: allItems.filter((i) => sourceLabel(i.source) === 'Confirmation').length,
  };
  const completionPct = allItems.length > 0 ? Math.round((statusCounts.done / allItems.length) * 100) : 0;
  const activeFilterCount = (groupBy !== 'trade' ? 1 : 0) + (sourceFilter !== 'all' ? 1 : 0);

  const q = search.trim().toLowerCase();
  const visible = allItems.filter((i) => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (sourceFilter === 'spec' && sourceLabel(i.source) !== 'Spec Checklist') return false;
    if (sourceFilter === 'conf' && sourceLabel(i.source) !== 'Confirmation') return false;
    if (q && !`${i.text} ${i.location} ${i.trade}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const groupKey = (i: PunchItem): string => {
    if (groupBy === 'room') return i.location?.trim() || 'No location';
    if (groupBy === 'priority')
      return i.priority === 'hot' ? 'Priority' : i.priority === 'elevated' ? 'Elevated' : 'Standard';
    return i.trade || 'Uncategorized';
  };

  const groups: Record<string, PunchItem[]> = {};
  for (const i of visible) {
    const k = groupKey(i);
    (groups[k] ||= []).push(i);
  }
  const groupOrder = Object.keys(groups).sort((a, b) => {
    if (groupBy === 'priority') return (PRIORITY_RANK[a] ?? 9) - (PRIORITY_RANK[b] ?? 9);
    return a.localeCompare(b);
  });

  const groupProgress = (items: PunchItem[]) => {
    const done = items.filter((i) => i.status === 'done').length;
    return items.length ? Math.round((done / items.length) * 100) : 0;
  };

  const selectedItems = allItems.filter((i) => selected.has(i.id));

  const toggleSelect = (itemId: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(itemId) ? n.delete(itemId) : n.add(itemId);
      return n;
    });
  const clearSelected = () => setSelected(new Set());

  const patchProject = async (data: Partial<ProjectType>) => {
    try {
      const { project: updated } = await updateProject(project.id, data);
      setProject((p) => (p ? { ...p, ...updated } : p));
    } catch {
      addToast('Failed to update home', 'error');
    }
  };

  const cycleStatus = async (item: PunchItem) => {
    const next = item.status === 'pending' ? 'wip' : item.status === 'wip' ? 'done' : 'pending';
    try {
      await updateItem(item.id, { status: next });
      load();
    } catch {
      addToast('Failed to update', 'error');
    }
  };

  const togglePriority = async (item: PunchItem) => {
    const next = item.priority === 'hot' ? 'normal' : 'hot';
    try {
      await updateItem(item.id, { priority: next });
      load();
    } catch {
      addToast('Failed to update', 'error');
    }
  };

  const copyItem = async (item: PunchItem) => {
    const text = item.location ? `${item.text} (${item.location})` : item.text;
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied to clipboard', 'success');
    } catch {
      addToast('Copy failed', 'error');
    }
  };

  const handleDelete = async (item: PunchItem) => {
    try {
      await deleteItem(item.id);
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(item.id);
        return n;
      });
      load();
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  const bulkMarkDone = async () => {
    try {
      await Promise.all(selectedItems.map((i) => updateItem(i.id, { status: 'done' })));
      addToast(`Marked ${selectedItems.length} done`, 'success');
      clearSelected();
      load();
    } catch {
      addToast('Bulk update failed', 'error');
    }
  };

  const bulkDelete = async () => {
    try {
      await Promise.all(selectedItems.map((i) => deleteItem(i.id)));
      addToast(`Deleted ${selectedItems.length} items`, 'success');
      clearSelected();
      load();
    } catch {
      addToast('Bulk delete failed', 'error');
    }
  };

  const openSend = (items: PunchItem[] | null) => {
    setSendItems(items);
    setShowSend(true);
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) {
      e.target.value = '';
      return;
    }
    setCameraUploading(true);
    try {
      const { files: uploaded } = await uploadFiles(id, [file]);
      const uf = uploaded[0];
      if (!uf) throw new Error('Upload returned no file');
      const result = await extractFile(uf.id);
      if (result.items.length === 0) {
        addToast('No punch items detected in photo', 'info');
      } else {
        await createItemsBulk(
          result.items.map((item) => ({
            projectId: id,
            text: item.text,
            trade: item.trade,
            priority: item.priority,
            source: 'Photo',
            sourceFileId: uf.id,
            location: item.location || '',
          }))
        );
        addToast(`Added ${result.items.length} items from photo`, 'success');
        load();
      }
    } catch (err) {
      addToast(`Photo extract failed: ${err}`, 'error');
    } finally {
      setCameraUploading(false);
      e.target.value = '';
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAdd.trim() || !id) return;
    try {
      await createItemsBulk([
        {
          projectId: id,
          text: quickAdd.trim(),
          trade: 'Uncategorized',
          location: '',
          priority: 'normal',
          source: 'Manual',
        },
      ]);
      setQuickAdd('');
      load();
    } catch {
      addToast('Failed to add', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, {
        text: editingItem.text,
        trade: editingItem.trade,
        location: editingItem.location,
        priority: editingItem.priority,
        notes: editingItem.notes,
        assignee: editingItem.assignee,
      });
      setEditingItem(null);
      load();
      addToast('Item updated', 'success');
    } catch {
      addToast('Failed to save', 'error');
    }
  };

  const toggleCollapse = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="pb-28">
      <TopBar
        title={project.address}
        back
        right={
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => nav('/settings')}
              aria-label="Settings"
              className="w-10 h-10 rounded-xl bg-[var(--card-2)] border-2 border-[var(--border)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent-glow)] transition-colors"
            >
              <Settings size={18} strokeWidth={2} />
            </button>
            {allItems.length > 0 && (
              <button onClick={() => openSend(null)} className="app-btn-primary text-sm py-2 px-3">
                <Send size={14} strokeWidth={2.5} />
                Send
              </button>
            )}
          </div>
        }
      />

      {project.community && (
        <p className="text-xs text-[var(--text-3)] -mt-2 mb-3 font-mono">
          {project.community.toUpperCase()}
          {project.lot ? ` · LOT ${project.lot}` : ''}
          {project.date ? ` · ${project.date}` : ''}
        </p>
      )}

      {/* Build stage + schedule — feeds the dashboard */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative">
          <select
            value={project.stage}
            onChange={(e) => patchProject({ stage: e.target.value })}
            aria-label="Build stage"
            className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-2 cursor-pointer focus:outline-none transition-colors ${
              project.stage === 'Complete'
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-tint)]'
            }`}
          >
            {BUILD_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={13} strokeWidth={2.5} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-70" />
        </div>
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
          Start
          <input
            type="date"
            value={project.startDate ?? ''}
            onChange={(e) => patchProject({ startDate: e.target.value || null })}
            className="px-2 py-1 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] text-xs focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">
          Target
          <input
            type="date"
            value={project.targetDate ?? ''}
            onChange={(e) => patchProject({ targetDate: e.target.value || null })}
            className="px-2 py-1 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] text-xs focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-3 px-3.5 py-2.5 rounded-xl bg-[var(--card)] border-2 border-[var(--border)] focus-within:border-[var(--accent-glow)] transition-colors">
        <Search size={16} strokeWidth={2} className="text-[var(--text-3)] shrink-0" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items, locations, trades…"
          className="flex-1 min-w-0 bg-transparent text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none text-sm"
        />
        {search ? (
          <button onClick={() => setSearch('')} className="text-[var(--text-3)] hover:text-[var(--text)]">
            <X size={15} strokeWidth={2} />
          </button>
        ) : (
          <kbd className="hidden sm:inline text-[10px] font-mono text-[var(--text-3)] bg-[var(--card-2)] border border-[var(--border-2)] rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Progress */}
      {allItems.length > 0 && (
        <div className="app-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
              Progress
            </div>
            <div className="font-display text-3xl font-extrabold text-[var(--accent)] tabular-nums leading-none">
              {completionPct}%
            </div>
          </div>
          <div className="w-full h-2.5 bg-[var(--card-2)] rounded-full overflow-hidden border border-[var(--border)] mb-3.5">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent-deep)] to-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <MetricTile label="Done" value={statusCounts.done} tone="green" active={filter === 'done'} onClick={() => setFilter(filter === 'done' ? 'all' : 'done')} />
            <MetricTile label="Pending" value={statusCounts.pending} active={filter === 'pending'} onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} />
            <MetricTile label="Total" value={allItems.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          </div>
        </div>
      )}

      {/* Files */}
      {project.files && project.files.length > 0 && (
        <FilesCollapse
          files={project.files}
          open={!collapsed.__files}
          onToggle={() => setCollapsed((c) => ({ ...c, __files: !c.__files }))}
        />
      )}

      {/* Status chips + Filters menu */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'pending', 'wip', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border shrink-0 flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-transparent text-[var(--text-2)] border-[var(--border-2)] hover:border-[var(--text-3)] hover:text-[var(--text)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'wip' ? 'WIP' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`font-mono ${filter === f ? 'opacity-80' : 'text-[var(--text-3)]'}`}>{statusCounts[f]}</span>
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <SlidersHorizontal size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-[var(--accent)] text-white rounded-full px-1.5 text-[10px] font-extrabold">{activeFilterCount}</span>
            )}
          </button>

          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[300px] max-w-[calc(100vw-32px)] rounded-2xl bg-[var(--card)] border-2 border-[var(--border-2)] shadow-2xl p-4 animate-fade-up">
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Group by</div>
                  <div className="flex gap-1 bg-[var(--card-2)] border border-[var(--border)] rounded-full p-1">
                    {(['trade', 'room', 'priority'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGroupBy(g)}
                        className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                          groupBy === g ? 'bg-[var(--card-3)] text-[var(--text)]' : 'text-[var(--text-3)] hover:text-[var(--text)]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">Source</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['all', 'All', sourceCounts.all],
                      ['spec', 'Spec Checklist', sourceCounts.spec],
                      ['conf', 'Confirmation', sourceCounts.conf],
                    ] as const).map(([key, lbl, count]) => (
                      <button
                        key={key}
                        onClick={() => setSourceFilter(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          sourceFilter === key
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)]'
                        }`}
                      >
                        {lbl} <span className="opacity-70 font-mono">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => { setGroupBy('trade'); setSourceFilter('all'); }}
                    className="text-xs font-semibold text-[var(--text-3)] hover:text-[var(--text)] px-2"
                  >
                    Reset
                  </button>
                  <button onClick={() => setFiltersOpen(false)} className="app-btn-primary text-xs py-1.5 px-4">
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 mb-4 px-4 py-2.5 rounded-xl bg-[var(--accent-tint)] border-2 border-[var(--accent)] animate-fade-up">
          <span className="text-sm font-bold text-[var(--accent)]">{selected.size} selected</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => openSend(selectedItems)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors">
              Send
            </button>
            <button onClick={bulkMarkDone} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors">
              Mark done
            </button>
            <button onClick={bulkDelete} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-colors">
              Delete
            </button>
            <button onClick={clearSelected} aria-label="Clear selection" className="text-[var(--text-3)] hover:text-[var(--text)] p-1">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      {groupOrder.length === 0 ? (
        <div className="app-card text-center py-8">
          <FileText size={28} className="mx-auto text-[var(--text-4)] mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-[var(--text-2)]">
            {allItems.length === 0 ? 'No items yet' : 'No items match your filters'}
          </p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            {allItems.length === 0 ? 'Add files or type below to get started' : 'Try clearing search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupOrder.map((key) => {
            const groupItems = groups[key] ?? [];
            const pct = groupProgress(groupItems);
            const isCollapsed = collapsed[key];
            return (
              <section key={key}>
                <button onClick={() => toggleCollapse(key)} className="w-full flex items-center justify-between mb-2 group">
                  <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-[var(--text)] text-left">
                    {key} <span className="font-mono text-[var(--text-3)]">({groupItems.length})</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[var(--text-3)] tabular-nums">{pct}%</span>
                    <ChevronDown
                      size={16}
                      strokeWidth={2}
                      className={`text-[var(--text-3)] transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    />
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2.5">
                    {groupItems.map((item) => (
                      <PunchItemRow
                        key={item.id}
                        item={item}
                        projectId={project.id}
                        selected={selected.has(item.id)}
                        onToggleSelect={() => toggleSelect(item.id)}
                        onCycleStatus={() => cycleStatus(item)}
                        onTogglePriority={() => togglePriority(item)}
                        onCopy={() => copyItem(item)}
                        onSend={() => openSend([item])}
                        onEdit={() => setEditingItem({ ...item })}
                        onDelete={() => handleDelete(item)}
                        onTradeSteps={() => setStepsItem(item)}
                      />
                    ))}
                  </div>
                )}
                <div className="h-px bg-[var(--border)] mt-4" />
              </section>
            );
          })}
        </div>
      )}

      {/* Add files CTA */}
      <button
        onClick={() => nav(`/project/${id}/intake`)}
        className="w-full mt-5 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--text-3)] hover:border-[var(--accent-glow)] hover:text-[var(--accent)] font-semibold text-sm transition-colors"
      >
        + Add files or extract from PDF
      </button>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-5 py-3 border-t-2" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-[680px] lg:max-w-[880px] mx-auto flex gap-2">
          <button
            onClick={() => setShowVoice(true)}
            aria-label="Voice capture"
            className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent-deep)] to-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] hover:scale-105 transition-transform flex items-center justify-center"
          >
            <Mic size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={cameraUploading}
            aria-label="Take photo of notes"
            className="w-12 h-12 shrink-0 rounded-xl bg-[var(--card-2)] border-2 border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent-glow)] transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {cameraUploading ? <Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> : <Camera size={18} strokeWidth={2.5} />}
          </button>
          <input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            placeholder="Add punch item…"
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm"
          />
          <button onClick={handleQuickAdd} disabled={!quickAdd.trim()} className="app-btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
      </div>

      {showSend && (
        <SendModal items={sendItems ?? allItems} projectAddress={project.address} onClose={() => { setShowSend(false); setSendItems(null); }} />
      )}

      {showVoice && (
        <VoiceCapture projectId={project.id} onClose={() => setShowVoice(false)} onCommitted={load} />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          projectId={project.id}
          onChange={setEditingItem}
          onSave={handleSaveEdit}
          onClose={() => setEditingItem(null)}
        />
      )}

      {stepsItem && (
        <TradeStepsModal
          item={stepsItem}
          onClose={() => setStepsItem(null)}
          onSaved={() => {
            setStepsItem(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MetricTile({
  label, value, tone, active, onClick,
}: {
  label: string;
  value: number;
  tone?: 'green';
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2.5 px-2 text-center transition-all border ${
        active ? 'border-[var(--accent)] bg-[var(--accent-tint)]' : 'border-[var(--border)] bg-[var(--card-2)] hover:-translate-y-0.5'
      }`}
    >
      <div className={`font-display text-lg font-extrabold tabular-nums ${tone === 'green' ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)] font-bold">{label}</div>
    </button>
  );
}

function PunchItemRow({
  item, projectId, selected, onToggleSelect, onCycleStatus, onTogglePriority,
  onCopy, onSend, onEdit, onDelete, onTradeSteps,
}: {
  item: PunchItem;
  projectId: string;
  selected: boolean;
  onToggleSelect: () => void;
  onCycleStatus: () => void;
  onTogglePriority: () => void;
  onCopy: () => void;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTradeSteps: () => void;
}) {
  const done = item.status === 'done';
  const wip = item.status === 'wip';
  const source = sourceLabel(item.source);

  return (
    <div
      className={`app-card !p-3.5 !rounded-2xl transition-colors ${
        selected ? '!border-[var(--accent)]' : ''
      } ${item.priority === 'hot' ? 'border-l-[3px] border-l-[var(--red)]' : ''} ${done ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Multi-select checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Select item"
          className="mt-1 w-5 h-5 shrink-0 rounded accent-[var(--accent)] cursor-pointer"
        />

        {/* Status cycle */}
        <button
          onClick={onCycleStatus}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            done ? 'bg-[var(--green)] border-[var(--green)]' : wip ? 'bg-[var(--amber)] border-[var(--amber)]' : 'border-[var(--border-2)] hover:border-[var(--accent)]'
          }`}
          aria-label={`Status: ${item.status}. Tap to cycle.`}
        >
          {done && <Check size={14} strokeWidth={3} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Task text — larger per v2 */}
          <p className={`text-[15px] font-bold leading-snug break-words ${done ? 'text-[var(--text-3)] line-through' : 'text-[var(--text)]'}`}>
            {item.text}
          </p>

          {/* Location on its own line */}
          {item.location && (
            <div className="flex items-center gap-1 mt-1.5 text-[13px] text-[var(--text-2)] font-medium">
              <MapPin size={13} strokeWidth={2.5} className="text-[var(--accent)] shrink-0" />
              {item.location}
            </div>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {item.priority === 'hot' && (
              <button
                onClick={onTogglePriority}
                title="Click to remove priority"
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                <Zap size={10} strokeWidth={2.5} />
                Priority
              </button>
            )}
            {item.priority === 'elevated' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30">
                <AlertCircle size={10} strokeWidth={2.5} />
                Elevated
              </span>
            )}
            {source && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--card-3)] text-[var(--text-2)]">
                {source}
              </span>
            )}
            {item.assignee && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30">
                <Check size={10} strokeWidth={3} />
                {item.assignee}
              </span>
            )}
          </div>

          {/* Photo strip */}
          <div className="mt-2.5 overflow-x-auto no-scrollbar">
            <PhotoAttachments itemId={item.id} projectId={projectId} compact />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-x-4 gap-y-1.5 mt-2.5 flex-wrap text-[12px] text-[var(--text-3)]">
            <ItemAction
              icon={ListPlus}
              label={item.tradeSteps && item.tradeSteps.length > 0 ? `Trade steps (${item.tradeSteps.length})` : 'Trade steps'}
              onClick={onTradeSteps}
              accent
            />
            {item.priority !== 'hot' && <ItemAction icon={Zap} label="Priority" onClick={onTogglePriority} accent />}
            <ItemAction icon={Pencil} label="Edit" onClick={onEdit} />
            <ItemAction icon={Copy} label="Copy" onClick={onCopy} />
            <ItemAction icon={Send} label="Send" onClick={onSend} />
            <ItemAction icon={Trash2} label="Delete" onClick={onDelete} danger />
          </div>
        </div>

        {/* Assign */}
        <button
          onClick={onEdit}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            item.assignee
              ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border-[var(--border-2)] bg-[var(--card-2)] text-[var(--text-2)] hover:border-[var(--text-3)]'
          }`}
        >
          {item.assignee ? item.assignee.split(' ')[0] : 'Assign'}
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function ItemAction({
  icon: Icon, label, onClick, accent, danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 transition-colors ${
        accent ? 'text-[var(--accent)] font-semibold hover:opacity-80' : danger ? 'hover:text-[var(--red)]' : 'hover:text-[var(--text)]'
      }`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </button>
  );
}

function FilesCollapse({
  files, open, onToggle,
}: {
  files: NonNullable<ProjectType['files']>;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--card-2)] border-2 border-[var(--border)] hover:border-[var(--accent-glow)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[var(--accent)]" strokeWidth={2} />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">Uploaded Files</span>
          <span className="font-mono text-[10px] text-[var(--text-3)] bg-[var(--card)] px-1.5 py-0.5 rounded-full border border-[var(--border)]">
            {files.length}
          </span>
        </div>
        <ChevronDown size={14} strokeWidth={2} className={`text-[var(--text-3)] transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2.5 bg-[var(--card-2)] rounded-lg border border-[var(--border)]">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text)] truncate">{f.originalName}</p>
                <p className="text-[10px] text-[var(--text-3)] font-mono uppercase tracking-wider">
                  {(f.sizeBytes / 1024).toFixed(0)} KB
                  {f.pageCount ? ` · ${f.pageCount}P` : ''}
                  {f.extractedItemCount ? ` · ${f.extractedItemCount} ITEMS` : ''}
                </p>
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ml-2 shrink-0 ${
                  f.extractionStatus === 'done'
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                    : f.extractionStatus === 'processing'
                      ? 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/30'
                      : f.extractionStatus === 'failed'
                        ? 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/30'
                        : 'bg-[var(--card)] text-[var(--text-3)] border-[var(--border)]'
                }`}
              >
                {f.extractionStatus}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditItemModal({
  item, projectId, onChange, onSave, onClose,
}: {
  item: PunchItem;
  projectId: string;
  onChange: (next: PunchItem) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 bg-[var(--card)] border-2 border-[var(--border)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-[var(--text)]">Edit Item</h3>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <Field label="Description">
          <textarea
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none resize-none transition-colors text-sm"
            rows={3}
            value={item.text}
            onChange={(e) => onChange({ ...item, text: e.target.value })}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Trade">
            <select
              className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
              value={item.trade}
              onChange={(e) => onChange({ ...item, trade: e.target.value })}
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
              value={item.priority}
              onChange={(e) => onChange({ ...item, priority: e.target.value as PunchItem['priority'] })}
            >
              <option value="normal">Normal</option>
              <option value="elevated">Elevated</option>
              <option value="hot">Priority</option>
            </select>
          </Field>
        </div>

        <Field label="Location">
          <input
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            placeholder="e.g. Kitchen"
            value={item.location}
            onChange={(e) => onChange({ ...item, location: e.target.value })}
          />
        </Field>
        <Field label="Assign to trade partner">
          <input
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            placeholder="Trade partner name"
            value={item.assignee}
            onChange={(e) => onChange({ ...item, assignee: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <textarea
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none resize-none transition-colors text-sm"
            rows={2}
            value={item.notes}
            onChange={(e) => onChange({ ...item, notes: e.target.value })}
          />
        </Field>

        <Field label="Photos">
          <PhotoAttachments itemId={item.id} projectId={projectId} />
        </Field>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="app-btn-ghost flex-1">Cancel</button>
          <button onClick={onSave} className="app-btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">{label}</div>
      {children}
    </label>
  );
}

const MANUAL = '__manual__';

function TradeStepsModal({
  item, onClose, onSaved,
}: {
  item: PunchItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const addToast = useUI((s) => s.addToast);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [steps, setSteps] = useState<string[]>(
    (item.tradeSteps ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((s) => s.note)
  );
  const [newStep, setNewStep] = useState('');
  const [assignee, setAssignee] = useState(item.assignee || '');
  const [manualMode, setManualMode] = useState(false);
  const [sendDate, setSendDate] = useState(item.sendDate || '');
  const [dueDate, setDueDate] = useState(item.dueDate || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listContacts()
      .then((r) => {
        setContacts(r.contacts);
        // If the current assignee isn't a known contact, treat it as manual entry.
        if (item.assignee && !r.contacts.some((c) => c.name === item.assignee)) setManualMode(true);
      })
      .catch(() => {});
  }, [item.assignee]);

  const addStep = () => {
    const v = newStep.trim();
    if (!v) return;
    setSteps((s) => [...s, v]);
    setNewStep('');
  };
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = s.slice();
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveTradeSteps(item.id, {
        steps,
        assignee,
        notes,
        sendDate: sendDate || null,
        dueDate: dueDate || null,
      });
      addToast('Trade steps saved', 'success');
      onSaved();
    } catch {
      addToast('Failed to save trade steps', 'error');
      setSaving(false);
    }
  };

  const selectValue = manualMode ? MANUAL : assignee || '';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 bg-[var(--card)] border-2 border-[var(--border)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-[var(--text)]">Trade Steps &amp; Scheduling</h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5 line-clamp-2">{item.text}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text)] transition-colors shrink-0">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Steps */}
        <Field label="Steps for the trade to complete">
          <div className="space-y-1.5">
            {steps.length === 0 && (
              <p className="text-xs text-[var(--text-3)] italic py-1">No steps yet — add the first below.</p>
            )}
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card-2)] border border-[var(--border)]">
                <div className="flex flex-col -my-1">
                  <button onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Move up" className="text-[var(--text-4)] hover:text-[var(--text-2)] disabled:opacity-30">
                    <ChevronUp size={13} strokeWidth={2.5} />
                  </button>
                  <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" className="text-[var(--text-4)] hover:text-[var(--text-2)] disabled:opacity-30">
                    <ChevronDown size={13} strokeWidth={2.5} />
                  </button>
                </div>
                <span className="flex-1 text-sm text-[var(--text)]">{step}</span>
                <button onClick={() => removeStep(i)} aria-label="Remove step" className="text-[var(--text-3)] hover:text-[var(--red)]">
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
              placeholder="Add a step…"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            />
            <button onClick={addStep} className="app-btn-ghost !py-2.5 !px-4 text-sm">Add</button>
          </div>
        </Field>

        <div className="h-px bg-[var(--border)]" />

        {/* Assign */}
        <Field label="Assign to trade partner">
          <select
            value={selectValue}
            onChange={(e) => {
              if (e.target.value === MANUAL) {
                setManualMode(true);
                setAssignee('');
              } else {
                setManualMode(false);
                setAssignee(e.target.value);
              }
            }}
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
          >
            <option value="">— Choose a trade partner —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}{c.trade ? ` (${c.trade})` : ''}
              </option>
            ))}
            <option value={MANUAL}>Someone else (enter manually)</option>
          </select>
          {manualMode && (
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Trade partner name"
              autoFocus
              className="w-full mt-2 px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            />
          )}
        </Field>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Send request on">
            <input
              type="date"
              value={sendDate}
              onChange={(e) => setSendDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            />
          </Field>
          <Field label="Complete by">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none text-sm transition-colors"
            />
          </Field>
        </div>

        {/* Notes */}
        <Field label="Notes for the trade (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Homeowner walk-through Friday — please prioritize"
            className="w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none resize-none text-sm transition-colors"
          />
        </Field>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="app-btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="app-btn-primary flex-1 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
