import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-lg space-y-4 py-10">
      <p className="label-strong">404</p>
      <h1 className="text-3xl">Page not found</h1>
      <p className="text-muted">That route does not exist. Try one of these:</p>
      <ul className="list-disc pl-5 text-[14px]">
        <li><Link href="/ask" className="text-accent underline underline-offset-2">Ask PostalMind</Link></li>
        <li><Link href="/evidence" className="text-accent underline underline-offset-2">Evidence dashboard</Link></li>
        <li><Link href="/sources" className="text-accent underline underline-offset-2">Source library</Link></li>
        <li><Link href="/methodology" className="text-accent underline underline-offset-2">Methodology</Link></li>
      </ul>
    </div>
  );
}
