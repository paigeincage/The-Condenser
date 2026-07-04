import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { createProject } from '../api/projects';
import { uploadFiles, extractFile } from '../api/files';
import { createItemsBulk } from '../api/items';
import { TopBar } from '../components/layout/TopBar';
import { DropZone } from '../components/intake/DropZone';
import { ExtractionReview, type ReviewItem } from '../components/intake/ExtractionReview';
import { useUI } from '../stores/ui';

type Step = 'info' | 'upload' | 'review' | 'done';

const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base';

export function NewProject() {
  const nav = useNavigate();
  const addToast = useUI((s) => s.addToast);

  const [step, setStep] = useState<Step>('info');
  const [address, setAddress] = useState('');
  const [community, setCommunity] = useState('');
  const [lot, setLot] = useState('');
  const [projectId, setProjectId] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [committing, setCommitting] = useState(false);

  const handleCreateProject = async () => {
    if (!address.trim()) return;
    try {
      const { project } = await createProject({
        address: address.trim(),
        community: community.trim(),
        lot: lot.trim(),
        userId: TEMP_USER_ID,
      });
      setProjectId(project.id);
      setStep('upload');
      addToast('Project created', 'success');
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  const handleExtract = async () => {
    if (!files.length) return;
    setExtracting(true);
    setExtractProgress('Uploading files…');
    try {
      const { files: uploaded } = await uploadFiles(projectId, files);
      const allItems: ReviewItem[] = [];
      for (const uf of uploaded) {
        setExtractProgress(`Extracting: ${uf.originalName}…`);
        try {
          const result = await extractFile(uf.id);
          const items: ReviewItem[] = result.items.map((item) => ({
            ...item,
            selected: !item.repaired,
            fileId: uf.id,
            fileName: uf.originalName,
          }));
          allItems.push(...items);
        } catch (err) {
          addToast(`Failed to extract ${uf.originalName}: ${err}`, 'error');
        }
      }
      setReviewItems(allItems);
      setStep('review');
      addToast(`Extracted ${allItems.length} items from ${uploaded.length} file(s)`, 'success');
    } catch (err) {
      addToast(`Upload failed: ${err}`, 'error');
    } finally {
      setExtracting(false);
      setExtractProgress('');
    }
  };

  const handleCommit = async (selected: ReviewItem[]) => {
    setCommitting(true);
    try {
      await createItemsBulk(
        selected.map((item) => ({
          projectId,
          text: item.text,
          trade: item.trade,
          priority: item.priority,
          source: item.fileName,
          sourceFileId: item.fileId,
          location: item.location || '',
        }))
      );
      addToast(`Added ${selected.length} items`, 'success');
      nav(`/project/${projectId}`);
    } catch (err) {
      addToast(`Failed: ${err}`, 'error');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="pb-8">
      <TopBar title="New Project" back />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        <StepPill label="Info" active={step === 'info'} done={step !== 'info'} />
        <div className="flex-1 h-px bg-[var(--border)]" />
        <StepPill label="Upload" active={step === 'upload'} done={step === 'review'} />
        <div className="flex-1 h-px bg-[var(--border)]" />
        <StepPill label="Review" active={step === 'review'} done={false} />
      </div>

      {step === 'info' && (
        <div className="app-card space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-1.5 block">
              Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              className={INPUT_CLASS}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-1.5 block">
                Community
              </label>
              <input
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="Madelines Meadow"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] mb-1.5 block">
                Lot
              </label>
              <input
                type="text"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder="42"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <button
            onClick={handleCreateProject}
            disabled={!address.trim()}
            className="app-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-2)]">
            Upload inspection reports, punch lists, photos, or docs. Claude reads them and extracts punch
            items automatically.
          </p>

          <DropZone files={files} onFilesChange={setFiles} disabled={extracting} />

          {extracting ? (
            <div className="app-card text-center py-6">
              <Loader2
                size={28}
                className="animate-spin mx-auto mb-3 text-[var(--accent)]"
                strokeWidth={2}
              />
              <p className="text-sm font-semibold text-[var(--text)]">{extractProgress}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Claude is reading your documents…</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => nav(`/project/${projectId}`)}
                className="app-btn-ghost flex-1"
              >
                Skip for now
              </button>
              <button
                onClick={handleExtract}
                disabled={!files.length}
                className="app-btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Extract Items
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div>
          {/* Summary + quick actions at the top so the user always has an escape route */}
          <div className="app-card mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
                  Extraction complete
                </div>
                <div className="font-display text-2xl font-extrabold uppercase text-[var(--text)] leading-none mt-1">
                  {reviewItems.length === 0
                    ? 'No items found'
                    : `${reviewItems.length} item${reviewItems.length !== 1 ? 's' : ''} found`}
                </div>
                <p className="text-xs text-[var(--text-3)] mt-1">
                  {reviewItems.length === 0
                    ? 'Try another file or skip and add items manually.'
                    : 'Review below — deselect anything you don\'t need, then tap Add.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => setStep('upload')} className="app-btn-ghost flex-1 text-sm">
                <RefreshCw size={14} strokeWidth={2.5} />
                Upload more
              </button>
              <button
                onClick={() => nav(`/project/${projectId}`)}
                className="app-btn-ghost flex-1 text-sm"
              >
                Skip and go to project
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <ExtractionReview
            items={reviewItems}
            onItemsChange={setReviewItems}
            onCommit={handleCommit}
            loading={committing}
          />
        </div>
      )}
    </div>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 shrink-0 ${
        active
          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
          : done
            ? 'bg-[var(--accent-tint)] text-[var(--accent)] border-[var(--accent-tint-2)]'
            : 'bg-[var(--card-2)] text-[var(--text-3)] border-[var(--border)]'
      }`}
    >
      {label}
    </span>
  );
}
