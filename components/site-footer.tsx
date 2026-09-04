import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-base font-bold">PostalMind AI</p>
          <p className="mt-1 text-[13px] text-muted">
            Tools for GDS. Evidence for accountability.
          </p>
          <p className="mt-3 text-[12px] text-faint">
            Built by a serving Gramin Dak Sevak from direct operational experience. Independent —
            not affiliated with or endorsed by India Post or the Department of Posts.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="label-strong">Use</p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
            <li><Link href="/ask" className="hover:text-accent">Ask PostalMind</Link></li>
            <li><Link href="/evidence" className="hover:text-accent">Analyse evidence</Link></li>
            <li><Link href="/status" className="hover:text-accent">Know your status</Link></li>
            <li><Link href="/tools" className="hover:text-accent">Tools</Link></li>
          </ul>
        </nav>
        <nav aria-label="Method">
          <p className="label-strong">Method</p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
            <li><Link href="/methodology" className="hover:text-accent">Methodology</Link></li>
            <li><Link href="/sources" className="hover:text-accent">Source library</Link></li>
            <li><Link href="/ground-reality" className="hover:text-accent">Ground Reality</Link></li>
          </ul>
        </nav>
        <nav aria-label="About">
          <p className="label-strong">About</p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
            <li><Link href="/privacy" className="hover:text-accent">Privacy</Link></li>
            <li><Link href="/disclaimer" className="hover:text-accent">Disclaimer</Link></li>
            <li>
              <a href="https://github.com/Rishidar-lab/postalmind-ai" className="hover:text-accent" rel="noopener noreferrer">
                Source code
              </a>
            </li>
            <li><Link href="/status/health" className="hover:text-accent">System status</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-4 text-[12px] text-faint">
          © {new Date().getFullYear()} PostalMind AI. Evidence classifications on this site are
          evidence categories, not legal findings. Nothing here is legal advice.
        </p>
      </div>
    </footer>
  );
}
