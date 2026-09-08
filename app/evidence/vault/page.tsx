import type { Metadata } from 'next';
import { VaultClient } from '@/components/vault-client';

export const metadata: Metadata = {
  title: 'Local vault',
  description: 'Durable on-device case storage with portable encrypted backup.',
};

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="label-strong">Evidence · Local vault</p>
        <h1 className="mt-2 text-3xl">Cases on this device</h1>
        <p className="mt-3 text-muted">
          IndexedDB persistence with schema versioning. Export a <code>.postalmind-case</code> file
          to move or back up a case; import verifies SHA-256 hashes before applying anything.
        </p>
      </header>
      <VaultClient />
    </div>
  );
}
