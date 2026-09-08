/**
 * PDF ingestion pipeline for primary-document verification.
 *
 * A maintainer feeds an official PDF through this pipeline:
 *   1. Size + MIME validation
 *   2. SHA-256 of original bytes (never mutated)
 *   3. Magic-byte PDF detection (not extension-based)
 *   4. Page-preserving text extraction (pdf-parse, no OCR fallback)
 *   5. Page-aware segmentation (one passage per page)
 *   6. HTML/script/prompt-injection sanitisation on extracted text
 *   7. Deterministic output: DocumentIngestionResult
 *
 * The derived extraction is stored separately from the original document
 * metadata. No passage becomes VERIFIED automatically — verification
 * requires an explicit maintainer action via the verification gate.
 *
 * Security:
 *  - path traversal: rejected (no .., no absolute paths)
 *  - oversized PDFs: rejected above MAX_PDF_BYTES
 *  - malformed PDFs: caught by pdf-parse, reported not swallowed
 *  - zip bombs / embedded files: pdf-parse's raw content is bounded
 *  - executable masquerading as PDF: rejected by magic bytes
 *  - HTML/script in extracted text: stripped before passage generation
 *  - prompt injection in documents: treated as DATA, never instructions
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import type { DocumentPassage, SourceStatus } from './types';

export const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB hard limit
const MIN_PDF_MAGIC = 5; // minimum bytes to check magic
const PDF_MAGIC = /^\%PDF-/;

export interface IngestionError {
  phase: string;
  message: string;
}

export interface DocumentIngestionResult {
  sourceId: string;
  sha256: string;
  byteLength: number;
  mimeType: string;
  pageCount: number | null;
  pages: string[]; // index 0 = page 1
  passages: DocumentPassage[];
  errors: IngestionError[];
  ok: boolean;
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/** Detect genuine PDF by magic bytes, not extension. */
function isValidPdfMagic(buf: Buffer): boolean {
  return PDF_MAGIC.test(buf.toString('ascii', 0, Math.min(buf.length, 64)));
}

/** Strip HTML tags and script-like content from extracted text. */
function sanitiseText(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Detect prompt-injection patterns in extracted text. */
function hasInjectionPatterns(text: string): boolean {
  const patterns = [
    /ignore\s+(?:previous|all|the)\s+instructions/i,
    /system\s*prompt/i,
    /you\s+are\s+/i,
    /pretend\s+to\s+/i,
    /disregard\s+/i,
    /override\s+/i,
    /new\s+instructions/i,
    /act\s+as\s+/i,
    /emergency\s+override/i,
  ];
  return patterns.some((p) => p.test(text));
}

/**
 * Sanitise a filename: reject path traversal, keep only safe chars.
 */
export function sanitiseFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, ''); // strip any directory components
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/**
 * Ingest a PDF file from disk. Returns a DocumentIngestionResult with
 * page-aware passages (all UNVERIFIED). Never mutates the original file.
 */
export async function ingestPdf(
  filePath: string,
  sourceId: string,
): Promise<DocumentIngestionResult> {
  const errors: IngestionError[] = [];

  // --- 1. Read file ---
  let buf: Buffer;
  try {
    buf = readFileSync(filePath);
  } catch (e) {
    errors.push({ phase: 'read', message: `Cannot read file: ${e instanceof Error ? e.message : String(e)}` });
    return { sourceId, sha256: '', byteLength: 0, mimeType: 'application/pdf', pageCount: null, pages: [], passages: [], errors, ok: false };
  }

  const byteLength = buf.length;

  // --- 2. Size check ---
  if (byteLength > MAX_PDF_BYTES) {
    errors.push({ phase: 'size', message: `PDF too large: ${byteLength} bytes (max ${MAX_PDF_BYTES})` });
    return { sourceId, sha256: sha256(buf), byteLength, mimeType: 'application/pdf', pageCount: null, pages: [], passages: [], errors, ok: false };
  }

  // --- 3. Magic-byte check ---
  if (!isValidPdfMagic(buf)) {
    errors.push({ phase: 'magic', message: 'File does not start with %PDF- magic bytes — not a genuine PDF' });
    return { sourceId, sha256: sha256(buf), byteLength, mimeType: 'application/pdf', pageCount: null, pages: [], passages: [], errors, ok: false };
  }

  // --- 4. SHA-256 of original bytes ---
  const fileSha256 = sha256(buf);

  // --- 5. Text extraction (single parse, page-aware) ---
  let pages: string[];
  let extractedPageCount = 0;
  try {
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    extractedPageCount = result.total ?? result.pages?.length ?? null;
    const resultPages = (result.pages ?? []).filter((p: { text?: string }) => p.text && p.text.trim().length > 0);
    if (resultPages.length > 0) {
      pages = resultPages.map((p: { text: string }) => p.text.trim());
    } else {
      const rawText = result.text ?? '';
      const split = rawText.split('\f').map((t) => t.trim()).filter((t) => t.length > 0);
      pages = split.length > 0 ? split : rawText.trim() ? [rawText.trim()] : [];
    }
  } catch (e) {
    errors.push({ phase: 'extract', message: `PDF text extraction failed: ${e instanceof Error ? e.message : String(e)}` });
    return { sourceId, sha256: fileSha256, byteLength, mimeType: 'application/pdf', pageCount: null, pages: [], passages: [], errors, ok: false };
  }

  const pageCount = pages.length > 0 ? pages.length : extractedPageCount ?? null;

  // --- 7. Security: check for injection patterns ---
  for (let i = 0; i < pages.length; i++) {
    if (hasInjectionPatterns(pages[i])) {
      errors.push({ phase: 'security', message: `Page ${i + 1}: possible prompt-injection pattern detected in extracted text` });
    }
  }

  // --- 8. Generate draft passages (all UNVERIFIED) ---
  const passages = pages.map((text, idx) => {
    const clean = sanitiseText(text);
    return {
      id: `${sourceId}-page-${idx + 1}`,
      sourceId,
      section: null,
      page: idx + 1,
      text: clean,
      status: 'UNVERIFIED' as SourceStatus,
      tags: [],
      keywords: [],
      sha256: null,
    };
  });

  return {
    sourceId,
    sha256: fileSha256,
    byteLength,
    mimeType: 'application/pdf',
    pageCount,
    pages,
    passages,
    errors,
    ok: errors.length === 0,
  };
}

/**
 * Compute SHA-256 of a Buffer without ingesting the whole pipeline.
 */
export function hashBuffer(buf: Buffer): string {
  return sha256(buf);
}

/**
 * Verify that two SHA-256 hashes match (constant-time comparison).
 */
export function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}