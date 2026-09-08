import { CATEGORY_META, type EvidenceCategory, type EvidenceItem } from '@/lib/evidence/types';
import type { Timeline } from '@/lib/evidence/timeline';
import { CategoryTag, StrengthChip } from './chips';

export function EvidenceItemCard({ item }: { item: EvidenceItem }) {
  return (
    <article className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {item.category.map((c) => (
            <CategoryTag key={c} value={c} />
          ))}
        </div>
        <StrengthChip value={item.evidenceStrength} />
      </div>
      <p className="mt-2 text-[13px] text-faint">
        {item.timestamp ?? 'undated'}
        {item.speakerLabel ? ` · ${item.speakerLabel}` : ''} · {item.speakerRole.toLowerCase().replace(/_/g, ' ')}
      </p>
      <blockquote className="mt-2 border-l-2 border-line pl-3 text-[14px]">{item.rawExcerpt}</blockquote>

      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer text-accent">Why this classification</summary>
        <div className="mt-2 space-y-2 text-muted">
          <div>
            <p className="font-semibold text-ink">Signals</p>
            <p>{item.analysis.reasons.join('; ') || '—'}</p>
          </div>
          <div>
            <p className="font-semibold text-ink">What this supports</p>
            <ul className="list-disc pl-5">
              {item.analysis.supports.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--warn)' }}>
              What this does NOT establish
            </p>
            <ul className="list-disc pl-5">
              {item.analysis.doesNotEstablish.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          {item.corroboration.length > 0 && (
            <p>
              <span className="font-semibold text-ink">Corroborated by</span> {item.corroboration.length} other item(s)
            </p>
          )}
          {item.counterEvidence.length > 0 && (
            <p>
              <span className="font-semibold text-ink">Counter-evidence</span>: {item.counterEvidence.join('; ')}
            </p>
          )}
        </div>
      </details>
    </article>
  );
}

export function TimelineView({ timeline }: { timeline: Timeline }) {
  const phases: Array<[string, typeof timeline.phases.PRE_EVENT]> = [
    ['Pre-event', timeline.phases.PRE_EVENT],
    ['Event day', timeline.phases.EVENT_DAY],
    ['Post-event', timeline.phases.POST_EVENT],
    ['Undated', timeline.phases.UNDATED],
  ];
  return (
    <div className="space-y-6">
      {timeline.clusters.length > 0 && (
        <div className="card text-[13px]">
          <p className="label-strong">Activity clusters</p>
          <ul className="mt-2 list-disc pl-5 text-muted">
            {timeline.clusters.map((c, i) => (
              <li key={i}>
                {c.count} events between {c.start.slice(0, 16).replace('T', ' ')} and{' '}
                {c.end.slice(0, 16).replace('T', ' ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {phases.map(([label, events]) =>
        events.length === 0 ? null : (
          <div key={label}>
            <p className="label-strong">{label}</p>
            <ol className="mt-2 space-y-2 border-l border-line pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                  <p className="text-[12px] text-faint">
                    {e.at ? e.at.replace('T', ' ') : 'undated'} · {e.kind}
                  </p>
                  <p className="text-[14px]">{e.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {e.categories.map((c) => (
                      <CategoryTag key={c} value={c} />
                    ))}
                    {e.kind === 'evidence' && <StrengthChip value={e.evidenceStrength} />}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ),
      )}
    </div>
  );
}

export function PatternView({
  categories,
  isDemo,
}: {
  categories: Record<string, number>;
  isDemo: boolean;
}) {
  const rows = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => ({ cat: c as EvidenceCategory, n }));
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="label-strong">Category tally</p>
        {isDemo && <span className="chip chip-unknown">Demo data</span>}
      </div>
      <table className="data mt-3">
        <thead>
          <tr>
            <th>Evidence category</th>
            <th>Count</th>
            <th>Neutral by default?</th>
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cat}>
              <td>{CATEGORY_META[r.cat]?.label ?? r.cat}</td>
              <td>{r.n}</td>
              <td>{CATEGORY_META[r.cat]?.neutralByDefault ? 'yes' : 'no'}</td>
              <td style={{ width: 160 }}>
                <span
                  style={{
                    display: 'inline-block',
                    height: 8,
                    width: `${(r.n / max) * 100}%`,
                    background: 'var(--accent)',
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-faint">
        Counts are a straight tally of classifier output. They are not a measure of misconduct.
      </p>
    </div>
  );
}
