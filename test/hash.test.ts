import { describe, expect, it } from 'vitest';
import { sha256Hex, shortHash } from '@/lib/evidence/hash';
import { sha256HexSync } from '@/lib/evidence/hash-sync';

const KNOWN = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';

describe('sha256', () => {
  it('matches a known vector (async)', async () => {
    expect(await sha256Hex('test')).toBe(KNOWN);
  });

  it('matches a known vector (sync)', () => {
    expect(sha256HexSync('test')).toBe(KNOWN);
  });

  it('async and sync agree on unicode input', async () => {
    const s = 'மேளா இலக்கு 2026';
    expect(await sha256Hex(s)).toBe(sha256HexSync(s));
  });

  it('is stable and 64 hex chars', () => {
    const h = sha256HexSync('any bytes here');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256HexSync('any bytes here')).toBe(h);
  });

  it('changes when a single byte changes', () => {
    expect(sha256HexSync('evidence A')).not.toBe(sha256HexSync('evidence B'));
  });

  it('shortHash keeps head and tail', () => {
    expect(shortHash(KNOWN)).toBe('9f86d081…a08');
    expect(shortHash('abc')).toBe('abc');
  });
});
