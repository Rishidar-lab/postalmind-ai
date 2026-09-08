import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Tools' };

const TOOLS = [
  { href: '/tools/rti', t: 'RTI drafting', s: 'Generate a properly formatted RTI application with the correct structure and placeholders. Deterministic — no AI.', ready: true },
  { href: '/tools/timeline', t: 'Incident timeline generator', s: 'Build a PRE/EVENT/POST timeline from a WhatsApp export.', ready: true },
  { href: '/tools/workday', t: 'Workday log', s: 'A local, day-by-day record of scheduled vs. actual hours, duties and after-hours communication, with a weekly chronology.', ready: true },
  { href: '/tools/grievance', t: 'Grievance / representation drafting', s: 'Structured administrative representation from selected evidence.', ready: false },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Tools</p>
        <h1 className="mt-2 text-3xl">Practical utilities</h1>
        <p className="mt-3 text-muted">
          Drafting aids for common GDS needs. The RTI and timeline tools are deterministic — they use
          templates and your inputs, not a language model — so their output is predictable and
          reviewable.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <div key={tool.href} className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">{tool.t}</h2>
              {!tool.ready && <span className="chip chip-unknown">Planned</span>}
            </div>
            <p className="mt-1 text-[14px] text-muted">{tool.s}</p>
            {tool.ready ? (
              <Link href={tool.href} className="mt-3 inline-block text-[13px] text-accent underline underline-offset-2">
                Open →
              </Link>
            ) : (
              <p className="mt-3 text-[13px] text-faint">Not yet available.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
