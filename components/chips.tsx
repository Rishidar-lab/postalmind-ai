import { CATEGORY_META, type EvidenceCategory } from '@/lib/evidence/types';

export function ClassificationChip({ value }: { value: 'VERIFIED' | 'INFERENCE' | 'UNVERIFIED' | 'UNKNOWN' }) {
  const cls = {
    VERIFIED: 'chip chip-verified',
    INFERENCE: 'chip chip-inference',
    UNVERIFIED: 'chip chip-unverified',
    UNKNOWN: 'chip chip-unknown',
  }[value];
  return <span className={cls}>{value}</span>;
}

export function StrengthChip({ value }: { value: 'INSUFFICIENT' | 'WEAK' | 'MODERATE' | 'STRONG' }) {
  const cls = {
    STRONG: 'chip chip-strong',
    MODERATE: 'chip chip-moderate',
    WEAK: 'chip chip-weak',
    INSUFFICIENT: 'chip chip-insufficient',
  }[value];
  return <span className={cls}>{value}</span>;
}

export function VerdictChip({ value }: { value: 'PASS' | 'WARN' | 'BLOCK' }) {
  const cls = { PASS: 'chip chip-pass', WARN: 'chip chip-warn', BLOCK: 'chip chip-block' }[value];
  return <span className={cls}>{value}</span>;
}

export function CategoryTag({ value }: { value: EvidenceCategory }) {
  const meta = CATEGORY_META[value];
  return (
    <span
      className="badge"
      title={meta?.description}
      style={meta && !meta.neutralByDefault ? { borderColor: 'var(--warn)', color: 'var(--warn)' } : undefined}
    >
      {meta?.label ?? value}
    </span>
  );
}

export function SourceStatusChip({ value }: { value: 'VERIFIED' | 'UNVERIFIED' | 'DEMO' }) {
  const map = {
    VERIFIED: { cls: 'chip chip-verified', label: 'Verified' },
    UNVERIFIED: { cls: 'chip chip-unverified', label: 'Unverified summary' },
    DEMO: { cls: 'chip chip-unknown', label: 'Demo' },
  }[value];
  return <span className={map.cls}>{map.label}</span>;
}
