import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Lot } from '../db';
import { config } from '../config/builder';
import {} from 'react-router-dom';
import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useUI } from '../stores/ui';

export function Lots() {
  const allLots = useLiveQuery(() => db.lots.toArray()) ?? [];
  const addToast = useUI((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteData, setPasteData] = useState('');

  const filtered = allLots.filter(l => {
    const s = search.toLowerCase();
    const matchSearch = !search || l.address.toLowerCase().includes(s) || l.lotBlock.includes(search) || l.currentTask.toLowerCase().includes(s);
    const matchStage = !filterStage || l.scarStage === filterStage;
    return matchSearch && matchStage;
  });

  const handleImportPaste = async () => {
    if (!pasteData.trim()) return;
    try {
      const rows = pasteData.trim().split('\n').map(row => row.split('\t'));
      if (rows.length < 2) { addToast('Need at least a header row + data', 'error'); return; }

      const headers = rows[0]!.map(h => h.toLowerCase().trim());
      const findCol = (patterns: string[]) => headers.findIndex(h => patterns.some(p => h.includes(p)));

      const iLot = findCol(['lot', 'block']);
      const iAddr = findCol(['address', 'street']);
      const iPlan = findCol(['plan']);
      const iStage = findCol(['scar', 'stage']);
      const iTask = findCol(['task', 'current']);
      const iDays = findCol(['days']);
      const iVfd = findCol(['vfd', 'verified']);
      const iFinish = findCol(['finish', 'est']);
      const iContact = findCol(['contact', 'field', 'cm']);
      const iBuyer = findCol(['buyer', 'customer']);
      const iProduct = findCol(['product', 'type']);
      const iElev = findCol(['elev']);

      const lots: Lot[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r]!;
        if (!row[iAddr]?.trim()) continue;
        lots.push({
          lotBlock: row[iLot]?.trim() || '',
          address: row[iAddr]?.trim() || '',
          plan: row[iPlan]?.trim() || '',
          elevation: iElev >= 0 ? (row[iElev]?.trim() || '') : '',
          scarStage: row[iStage]?.trim() || 'Start',
          productType: iProduct >= 0 ? (row[iProduct]?.trim() || '') : '',
          fieldContact: iContact >= 0 ? (row[iContact]?.trim() || '') : config.user.name.split(' ').reverse().join(', '),
          buyer: iBuyer >= 0 ? row[iBuyer]?.trim() : undefined,
          vfdDate: iVfd >= 0 ? (row[iVfd]?.trim() || '') : '',
          estFinish: iFinish >= 0 ? (row[iFinish]?.trim() || '') : '',
          currentTask: iTask >= 0 ? (row[iTask]?.trim() || '') : '',
          taskDays: iDays >= 0 ? parseInt(row[iDays] || '0') || 0 : 0,
          updatedAt: new Date().toISOString(),
          createdAt: Date.now(),
        });
      }

      if (lots.length === 0) { addToast('No valid rows found', 'error'); return; }

      await db.lots.clear();
      await db.lots.bulkAdd(lots);
      addToast(`Imported ${lots.length} lots`, 'success');
      setShowPaste(false);
      setPasteData('');
    } catch (err) {
      addToast(`Import failed: ${err}`, 'error');
    }
  };

  return (
    <div>
      <TopBar
        title="Lots"
        back
        right={
          <button
            onClick={() => setShowPaste(true)}
            className="bg-mar text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-mar-light transition-colors"
          >
            Import from PCP
          </button>
        }
      />

      <p className="text-xs text-g400 -mt-4 mb-4">{filtered.length} lots in {config.user.community || 'your community'}</p>

      {/* Search + filters */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search address, lot, task..."
        className="w-full px-4 py-2.5 border-[1.5px] border-g200 rounded-xl text-sm text-cblack focus:outline-none focus:border-mar mb-3"
      />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilterStage('')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterStage ? 'bg-mar text-white' : 'bg-surface text-g500'}`}
        >
          All
        </button>
        {config.scarStages.map(stage => (
          <button
            key={stage}
            onClick={() => setFilterStage(filterStage === stage ? '' : stage)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStage === stage ? 'bg-mar text-white' : 'bg-surface text-g500'}`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Lots list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-g400 text-sm">
          {allLots.length === 0 ? 'No lots loaded. Use "Import from PCP" to paste lot data.' : 'No lots match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.sort((a, b) => a.taskDays - b.taskDays).map(lot => (
            <div key={lot.id} className="bg-[var(--card-2)] border-[1.5px] border-g200 rounded-[10px] p-3 hover:border-mar/30 transition-colors">
              <div className="flex items-center gap-3">
                <DaysBadge days={lot.taskDays} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cblack truncate">{lot.address}</p>
                  <p className="text-xs text-g400 truncate">Lot {lot.lotBlock} · {lot.plan} · {lot.fieldContact.split(', ')[1] || lot.fieldContact}</p>
                </div>
                <div className="text-right shrink-0">
                  <StageBadge stage={lot.scarStage} />
                  <p className="text-xs text-g400 mt-1">{lot.vfdDate}</p>
                </div>
              </div>
              {lot.currentTask && (
                <p className="text-xs text-g500 mt-2 truncate">Task: {lot.currentTask}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paste import modal */}
      {showPaste && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowPaste(false)}>
          <div className="bg-[var(--card-2)] w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 pb-3 border-b border-g100">
              <h3 className="text-lg font-bold text-cblack">Import Lots from PCP</h3>
              <p className="text-sm text-g400 mt-0.5">Copy your lot table from PCP portal and paste below</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                className="w-full border-[1.5px] border-g200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-mar resize-none"
                rows={12}
                placeholder="Paste tab-separated data from PCP here...&#10;&#10;Columns should include: Lot, Address, Plan, SCAR Stage, Current Task, Days, VFD Date, etc."
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-5 pt-3 border-t border-g100 flex gap-3">
              <button onClick={() => setShowPaste(false)} className="flex-1 py-3 rounded-xl border border-g200 text-g600 font-semibold text-sm">Cancel</button>
              <button
                onClick={handleImportPaste}
                disabled={!pasteData.trim()}
                className="flex-1 py-3 rounded-xl bg-mar text-white font-semibold text-sm hover:bg-mar-light disabled:opacity-40 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs font-bold px-2 py-1 rounded bg-red-50 text-red-600 shrink-0">{days}d</span>;
  if (days === 0) return <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-600 shrink-0">Today</span>;
  return <span className="text-xs font-bold px-2 py-1 rounded bg-green-50 text-green-600 shrink-0">+{days}d</span>;
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    Start: 'bg-blue-50 text-blue-600',
    Frame: 'bg-amber-50 text-amber-600',
    Second: 'bg-mar-l text-mar',
    Final: 'bg-green-50 text-green-600',
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[stage] ?? 'bg-surface text-g400'}`}>{stage}</span>;
}
