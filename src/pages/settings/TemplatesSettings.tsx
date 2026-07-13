import { Mail, MessageSquare } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { useProfile, saveProfile } from '../../hooks/useProfile';

function tplReplace(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

const VARS = [
  { key: 'project', label: '{project}', desc: 'the address' },
  { key: 'trade', label: '{trade}', desc: 'the trade' },
  { key: 'signoff', label: '{signoff}', desc: 'your name' },
];

const INPUT =
  'w-full px-3 py-2.5 rounded-lg border-2 border-[var(--border)] bg-[var(--card-2)] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none transition-colors text-sm';

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1.5">{children}</div>;
}

export function TemplatesSettings() {
  const profile = useProfile();

  const vars = {
    project: '1307 Live Oak',
    trade: 'Drywall',
    signoff: profile.signOff || profile.firstName || 'CM',
  };

  const sampleItems = ['1. Replace baseboard at living room', '2. Missing caulking under stairs'];

  const emailBody = [
    `Hi ${vars.trade},`,
    '',
    tplReplace(profile.emailIntro, vars),
    '',
    ...sampleItems,
    '',
    tplReplace(profile.emailSignOff, vars),
  ].join('\n');

  const textBody = [tplReplace(profile.textIntro, vars), ...sampleItems, tplReplace(profile.textSignOff, vars)].join('\n');

  return (
    <div className="pb-8">
      <TopBar title="Message Templates" back />

      <p className="text-sm text-[var(--text-2)] -mt-2 mb-4">
        Set how your punch lists read when you send them. These fill in automatically each time.
      </p>

      {/* Variable chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {VARS.map((v) => (
          <span key={v.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-tint)] border border-[var(--accent-tint-2)] text-xs">
            <code className="font-mono font-bold text-[var(--accent)]">{v.label}</code>
            <span className="text-[var(--text-3)]">{v.desc}</span>
          </span>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* EMAIL */}
        <div className="app-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-tint)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Mail size={17} strokeWidth={2} />
            </div>
            <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-[var(--text)]">Email</h2>
          </div>

          <div className="space-y-3">
            <label className="block">
              <Label>Subject line</Label>
              <input className={INPUT} value={profile.emailSubject} onChange={(e) => saveProfile({ emailSubject: e.target.value })} />
            </label>
            <label className="block">
              <Label>Intro</Label>
              <textarea rows={3} className={`${INPUT} resize-none`} value={profile.emailIntro} onChange={(e) => saveProfile({ emailIntro: e.target.value })} />
            </label>
            <label className="block">
              <Label>Sign-off</Label>
              <textarea rows={2} className={`${INPUT} resize-none`} value={profile.emailSignOff} onChange={(e) => saveProfile({ emailSignOff: e.target.value })} />
            </label>
          </div>

          <div className="mt-4 rounded-xl border-2 border-[var(--border)] overflow-hidden">
            <div className="bg-[var(--card-2)] px-3 py-2 border-b border-[var(--border)] space-y-0.5">
              <div className="text-[11px] text-[var(--text-3)]">To: <span className="text-[var(--text)]">{vars.trade}</span></div>
              <div className="text-[11px] text-[var(--text-3)] truncate">
                Subject: <span className="text-[var(--text)] font-semibold">{tplReplace(profile.emailSubject, vars)}</span>
              </div>
            </div>
            <pre className="p-3 text-[13px] text-[var(--text)] whitespace-pre-wrap font-sans leading-relaxed">{emailBody}</pre>
          </div>
        </div>

        {/* TEXT */}
        <div className="app-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-tint)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <MessageSquare size={17} strokeWidth={2} />
            </div>
            <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-[var(--text)]">Text Message</h2>
          </div>

          <div className="space-y-3">
            <label className="block">
              <Label>Intro</Label>
              <textarea rows={2} className={`${INPUT} resize-none`} value={profile.textIntro} onChange={(e) => saveProfile({ textIntro: e.target.value })} />
            </label>
            <label className="block">
              <Label>Sign-off</Label>
              <textarea rows={2} className={`${INPUT} resize-none`} value={profile.textSignOff} onChange={(e) => saveProfile({ textSignOff: e.target.value })} />
            </label>
          </div>

          <div className="mt-4 rounded-xl border-2 border-[var(--border)] bg-[var(--card-2)] p-3">
            <div className="flex justify-end">
              <div className="max-w-[88%] bg-[var(--accent)] text-white rounded-2xl rounded-br-md px-3.5 py-2.5">
                <pre className="text-[13px] whitespace-pre-wrap font-sans leading-relaxed">{textBody}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
