import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Mic,
  X,
  MapPin,
  Search,
  FolderClosed,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { listProjects } from '../api/projects';
import { useProfile } from '../hooks/useProfile';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import type { Project } from '../types';

type ModalKey = 'active' | 'spec' | 'docs' | 'add' | 'edit' | 'brain' | null;

export function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKey>(null);
  const profile = useProfile();
  const nav = useNavigate();

  useEffect(() => {
    listProjects()
      .then((r) => setProjects(r.projects))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const active = projects.filter((p) => p.status === 'active');
  const spec = projects.filter((p) => p.status === 'spec');
  const projectsWithDocs = projects.filter((p) => (p._count?.files || 0) > 0);
  const totalDocs = projects.reduce((n, p) => n + (p._count?.files || 0), 0);

  const openProject = (id: string) => {
    setModal(null);
    nav(`/project/${id}`);
  };

  return (
    <div className="pt-6 pb-24">
      {/* HEADER */}
      <header className="flex items-start justify-between mb-8 gap-3 animate-fade-up">
        <div className="min-w-0">
          <span className="app-chip">
            <Sparkles size={10} strokeWidth={2.5} />
            The Condenser
          </span>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-[var(--text)] leading-none mt-2">
            {profile.firstName ? `Hey, ${profile.firstName}` : 'Welcome back'}
          </h1>
          <p className="text-[11px] text-[var(--text-3)] mt-2">
            Built for construction managers, by a construction manager
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* QUICK ACTIONS */}
      <SectionLabel>Quick Actions</SectionLabel>
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-8 animate-fade-up"
        style={{ animationDelay: '0.1s' }}
      >
        <ActionTile
          primary
          icon={<Plus size={22} strokeWidth={2.5} />}
          title="New Project"
          desc="Start a new punch list or walk"
          onClick={() => nav('/new')}
        />
        <ActionTile
          icon={<Pencil size={18} strokeWidth={2} />}
          title="Edit / Add"
          desc="Update or add to an existing project"
          onClick={() => setModal('edit')}
        />
        <ActionTile
          icon={<Mic size={18} strokeWidth={2} />}
          title="Brain Dump"
          desc="Speak — Claude sorts multi-home rambles"
          onClick={() => setModal('brain')}
        />
      </div>

      {/* FILES */}
      <SectionLabel>Files</SectionLabel>
      <div
        className="grid grid-cols-2 gap-2.5 animate-fade-up"
        style={{ animationDelay: '0.2s' }}
      >
        <FolderTile
          count={loading ? '…' : active.length}
          name="Active Homes"
          desc="In-progress punch lists"
          onClick={() => setModal('active')}
        />
        <FolderTile
          count={loading ? '…' : spec.length}
          name="Spec Homes"
          desc="Model + inventory homes"
          onClick={() => setModal('spec')}
        />
        <FolderTile
          count={loading ? '…' : totalDocs}
          name="Documents"
          desc="Reports, notes, photos · filed per address"
          onClick={() => setModal('docs')}
        />
        <AddFolderTile onClick={() => setModal('add')} />
      </div>

      {/* MODALS */}
      {modal === 'active' && (
        <Modal
          onClose={() => setModal(null)}
          title="Active Homes"
          subtitle={`${active.length} in-progress ${active.length === 1 ? 'punch list' : 'punch lists'}`}
        >
          {active.length === 0 ? (
            <EmptyState
              icon={<FolderClosed size={28} />}
              msg="No active homes yet."
              hint="Tap New Project on the home screen to start your first one."
            />
          ) : (
            <div className="space-y-2">
              {active.map((p) => (
                <HomeCardMini key={p.id} project={p} onClick={() => openProject(p.id)} />
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'spec' && (
        <Modal
          onClose={() => setModal(null)}
          title="Spec Homes"
          subtitle="Model + inventory homes"
        >
          {spec.length === 0 ? (
            <EmptyState
              icon={<FolderClosed size={28} />}
              msg="No spec homes yet."
              hint='Set a project’s status to "spec" in Project settings to file it here.'
            />
          ) : (
            <div className="space-y-2">
              {spec.map((p) => (
                <HomeCardMini key={p.id} project={p} onClick={() => openProject(p.id)} />
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'docs' && (
        <Modal
          onClose={() => setModal(null)}
          title="Documents"
          subtitle="Reports, notes, photos — filed per address"
        >
          {projectsWithDocs.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              msg="No documents yet."
              hint="Upload a PDF from any project's Intake page and it lands here."
            />
          ) : (
            <div className="space-y-3">
              {projectsWithDocs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-[var(--card-2)] hover:bg-[var(--card-3)] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--card)] flex items-center justify-center shrink-0 text-[var(--accent)]">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-[var(--text)] truncate">
                      {p.address}
                    </div>
                    <div className="text-[11px] text-[var(--text-3)] font-mono">
                      {p._count?.files || 0}{' '}
                      {(p._count?.files || 0) === 1 ? 'file' : 'files'}
                      {p.community ? ` · ${p.community}` : ''}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[var(--text-3)] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'add' && (
        <Modal
          onClose={() => setModal(null)}
          title="Add File"
          subtitle="Custom folders — coming soon"
        >
          <EmptyState
            icon={<Plus size={28} />}
            msg="Custom file folders are coming in a future release."
            hint="You'll be able to add binders like Warranty Book, 90-day Follow-ups, or Vendor W-9s here."
          />
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal
          onClose={() => setModal(null)}
          title="Edit or Add to a Project"
          subtitle="Pick which home you're updating"
        >
          <EditPicker projects={projects} onPick={openProject} />
        </Modal>
      )}

      {modal === 'brain' && (
        <Modal
          onClose={() => setModal(null)}
          title="Voice Brain Dump"
          subtitle="Speak — Claude sorts multi-home rambles"
        >
          <EmptyState
            icon={<Mic size={28} />}
            msg="Voice Brain Dump is coming soon."
            hint="You'll be able to ramble across multiple homes in one recording and Claude will split it into per-address punch items automatically."
          />
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Local components

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-3 px-1">
      {children}
    </div>
  );
}

function ActionTile({
  icon,
  title,
  desc,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl p-4 flex items-start gap-3 transition-all group ${
        primary
          ? 'bg-[var(--accent)] text-white border-2 border-[var(--accent)] shadow-[0_8px_24px_-8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_12px_28px_-8px_var(--accent-glow)]'
          : 'bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--accent-glow)]'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          primary
            ? 'bg-white/20 text-white'
            : 'bg-[var(--card-2)] text-[var(--accent)]'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div
          className={`font-display uppercase font-bold text-[15px] tracking-tight leading-none ${
            primary ? 'text-white' : 'text-[var(--text)]'
          }`}
        >
          {title}
        </div>
        <div
          className={`text-[11px] mt-1.5 leading-snug ${
            primary ? 'text-white/80' : 'text-[var(--text-3)]'
          }`}
        >
          {desc}
        </div>
      </div>
    </button>
  );
}

function FolderTile({
  count,
  name,
  desc,
  onClick,
}: {
  count: number | string;
  name: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl p-4 bg-[var(--card)] border-2 border-[var(--border)] hover:border-[var(--accent-glow)] transition-all flex flex-col gap-2.5 min-h-[132px]"
    >
      <div className="flex items-start justify-between gap-2">
        <FolderSvg />
        <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-full bg-[var(--card-2)] text-[var(--text)]">
          {count}
        </span>
      </div>
      <div>
        <div className="font-display uppercase font-bold text-[17px] tracking-tight text-[var(--text)] leading-none">
          {name}
        </div>
        <div className="text-[11px] text-[var(--text-3)] mt-1.5 leading-snug">
          {desc}
        </div>
      </div>
    </button>
  );
}

function AddFolderTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-center rounded-2xl p-4 bg-transparent border-2 border-dashed border-[var(--border-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex flex-col items-center justify-center gap-1 min-h-[132px] text-[var(--text-3)] group"
    >
      <Plus size={28} strokeWidth={2.5} className="group-hover:text-[var(--accent)] transition-colors" />
      <div className="font-display uppercase font-bold text-[14px] tracking-tight mt-1">
        Add File
      </div>
      <div className="text-[10px] leading-snug px-2">
        Warranty book, punch history, anything
      </div>
    </button>
  );
}

function FolderSvg() {
  return (
    <svg width="42" height="34" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 8a4 4 0 0 1 4-4h11l5 5h16a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <path
        d="M2 12h40v20a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12z"
        fill="var(--accent)"
      />
    </svg>
  );
}

function Modal({
  onClose,
  title,
  subtitle,
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      style={{ animationDuration: '0.15s' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card)] border-2 border-[var(--border-2)] rounded-2xl w-full max-w-lg max-h-[86vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h3 className="font-display uppercase text-lg font-extrabold text-[var(--text)] tracking-tight leading-none">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--text-3)] mt-1.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center justify-center text-[var(--text-2)] shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function HomeCardMini({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const s = project.statusCounts || { pending: 0, wip: 0, done: 0 };
  const total = project._count?.items || 0;
  const pct = total > 0 ? Math.round((s.done / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--card-2)] hover:bg-[var(--card-3)] border border-[var(--border)] rounded-xl p-3.5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[15px] text-[var(--text)] truncate leading-tight">
            {project.address}
          </div>
          {(project.community || project.lot) && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-2)] mt-1">
              <MapPin size={11} className="text-[var(--accent)]" />
              {project.community}
              {project.lot ? ` · Lot ${project.lot}` : ''}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-[var(--text-3)] font-mono font-semibold">
            <span>
              {s.done}/{total} done
            </span>
            {(project._count?.files || 0) > 0 && (
              <span>
                {project._count?.files} {project._count?.files === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
        </div>
        <div className="font-display font-extrabold text-2xl text-[var(--accent)] leading-none tabular-nums shrink-0">
          {pct}%
        </div>
      </div>
      {total > 0 && (
        <div className="mt-3 h-1 bg-[var(--card)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </button>
  );
}

function EditPicker({
  projects,
  onPick,
}: {
  projects: Project[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = projects.filter((p) => {
    const s = q.toLowerCase();
    return (
      !s ||
      p.address.toLowerCase().includes(s) ||
      (p.community || '').toLowerCase().includes(s) ||
      (p.lot || '').toLowerCase().includes(s)
    );
  });
  return (
    <>
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by address, community, or lot…"
          className="w-full bg-[var(--card-2)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          msg="No matches."
          hint="Try a different search or create a new project."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <HomeCardMini key={p.id} project={p} onClick={() => onPick(p.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyState({
  icon,
  msg,
  hint,
}: {
  icon?: React.ReactNode;
  msg: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-10 px-4">
      {icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--card-2)] flex items-center justify-center text-[var(--text-3)] mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-[var(--text-2)]">{msg}</p>
      {hint && <p className="text-xs text-[var(--text-3)] mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
