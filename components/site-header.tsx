'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/ask', label: 'Ask' },
  { href: '/evidence', label: 'Evidence' },
  { href: '/status', label: 'Know Your Status' },
  { href: '/sources', label: 'Sources' },
  { href: '/ground-reality', label: 'Ground Reality' },
  { href: '/tools', label: 'Tools' },
  { href: '/methodology', label: 'Methodology' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="border-b border-line bg-surface">
      <div className="container-page flex items-center justify-between py-3">
        <Link href="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-serif text-lg font-bold tracking-tight">PostalMind AI</span>
          <span className="hidden text-[12px] text-faint sm:inline">Ground reality. Verified.</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-accent-soft ${
                isActive(n.href) ? 'text-accent underline underline-offset-4' : 'text-muted'
              }`}
              aria-current={isActive(n.href) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="btn lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-line lg:hidden">
          <ul className="container-page flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded px-2 py-2 text-sm ${
                    isActive(n.href) ? 'font-semibold text-accent' : 'text-muted'
                  }`}
                  aria-current={isActive(n.href) ? 'page' : undefined}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
