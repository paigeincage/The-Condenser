import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TopBar } from '../../components/layout/TopBar';
import { db, type Community, type CommunityHome } from '../../db';
import { Section } from '../../components/settings/SettingsField';
import { useUI } from '../../stores/ui';

const STAGES: CommunityHome['stage'][] = [
  'Pre-construction',
  'Framing',
  'Drywall',
  'Paint',
  'Trim',
  'Tile',
  'Punch',
  'Complete',
];

export function CommunitiesSettings() {
  const communities = useLiveQuery(() => db.communities.toArray()) ?? [];
  const homes = useLiveQuery(() => db.communityHomes.toArray()) ?? [];
  const addToast = useUI((s) => s.addToast);

  const [expanded, setExpanded] = useState<string | null>(null);

  const addCommunity = async () => {
    const name = prompt('Community name (e.g. Madelines Meadow)');
    if (!name) return;
    const latStr = prompt('Latitude (for weather) — e.g. 30.6327');
    const lonStr = prompt('Longitude (for weather) — e.g. -97.6779');
    const lat = parseFloat(latStr ?? '');
    const lon = parseFloat(lonStr ?? '');
    if (isNaN(lat) || isNaN(lon)) {
      addToast('Invalid coordinates', 'error');
      return;
    }
    const c: Community = {
      id: crypto.randomUUID(),
      name: name.trim(),
      lat,
      lon,
      isDefault: communities.length === 0,
      createdAt: new Date().toISOString(),
    };
    await db.communities.put(c);
    addToast(`${c.name} added`, 'success');
  };

  const removeCommunity = async (id: string) => {
    if (!confirm('Remove this community and all its homes?')) return;
    await db.communities.delete(id);
    await db.communityHomes.where('communityId').equals(id).delete();
  };

  const setDefault = async (id: string) => {
    await db.transaction('rw', db.communities, async () => {
      await Promise.all(
        communities.map((c) => db.communities.put({ ...c, isDefault: c.id === id }))
      );
    });
    addToast('Default community updated', 'success');
  };

  const addHome = async (communityId: string) => {
    const address = prompt('Address or lot number');
    if (!address) return;
    const h: CommunityHome = {
      id: crypto.randomUUID(),
      communityId,
      address: address.trim(),
      stage: 'Pre-construction',
      createdAt: new Date().toISOString(),
    };
    await db.communityHomes.put(h);
  };

  const updateHome = async (home: CommunityHome, patch: Partial<CommunityHome>) => {
    await db.communityHomes.put({ ...home, ...patch });
  };

  const removeHome = async (id: string) => {
    if (!confirm('Remove this home?')) return;
    await db.communityHomes.delete(id);
  };

  return (
    <div>
      <TopBar title="Communities & Homes" back />

      <Section title="Communities" description="Weather on the splash screen uses your default community.">
        {communities.length === 0 ? (
          <div className="text-sm text-g400 text-center py-4">No communities yet. Add one to enable weather.</div>
        ) : (
          communities.map((c) => {
            const cHomes = homes.filter((h) => h.communityId === c.id);
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="bg-[var(--card-2)] rounded-lg border-[1.5px] border-g200">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-cblack">{c.name}</div>
                      <div className="text-xs text-g400">
                        {cHomes.length} {cHomes.length === 1 ? 'home' : 'homes'} · {c.lat.toFixed(3)}, {c.lon.toFixed(3)}
                      </div>
                    </div>
                    {c.isDefault && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mar bg-mar-l px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <svg className={`text-g400 transition-transform ${isOpen ? 'rotate-90' : ''}`} width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 4L13 10L7 16" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-g200 p-3 space-y-3">
                    <div className="flex gap-2">
                      {!c.isDefault && (
                        <button
                          onClick={() => setDefault(c.id)}
                          className="text-xs font-semibold text-mar hover:underline"
                        >
                          Set as default
                        </button>
                      )}
                      <button
                        onClick={() => removeCommunity(c.id)}
                        className="text-xs font-semibold text-red-600 hover:underline ml-auto"
                      >
                        Remove community
                      </button>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-g500 mb-2">Homes</div>
                      {cHomes.length === 0 && (
                        <div className="text-xs text-g400 py-2">No homes yet.</div>
                      )}
                      <div className="space-y-2">
                        {cHomes.map((h) => (
                          <div key={h.id} className="bg-surface rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-semibold text-cblack flex-1">{h.address}</div>
                              <button
                                onClick={() => removeHome(h.id)}
                                className="text-xs text-red-600 font-semibold hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={h.stage}
                                onChange={(e) => updateHome(h, { stage: e.target.value as CommunityHome['stage'] })}
                                className="text-sm px-2 py-1.5 rounded border border-g200 bg-[var(--card-2)]"
                              >
                                {STAGES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={h.targetCompletionDate ?? ''}
                                onChange={(e) => updateHome(h, { targetCompletionDate: e.target.value })}
                                className="text-sm px-2 py-1.5 rounded border border-g200 bg-[var(--card-2)]"
                                placeholder="Target completion"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addHome(c.id)}
                        className="mt-2 w-full text-sm font-semibold text-mar border border-dashed border-mar/40 rounded-lg py-2 hover:bg-mar-l transition-colors"
                      >
                        + Add home
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        <button
          onClick={addCommunity}
          className="w-full bg-mar text-white font-bold py-3 rounded-lg hover:bg-mar-light transition-colors"
        >
          + Add community
        </button>
      </Section>
    </div>
  );
}
