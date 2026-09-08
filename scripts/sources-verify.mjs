#!/usr/bin/env node
/**
 * npm run sources:verify -- <source-id>
 *
 * Maintainer-side human verification gate.
 *
 * Presents:
 *  - source metadata
 *  - SHA-256
 *  - page text
 *  - proposed passage
 *  - original page reference
 *
 * Maintainer must explicitly approve each passage or the source.
 * Only then can status = VERIFIED be written.
 *
 * Usage:
 *   node scripts/sources-verify.mjs <source-id>
 *
 * Requires OPENROUTER_API_KEY to be unset or set (demo mode works).
 * The script reads content/sources.ts and content/corpus.ts directly
 * via dynamic import, then writes back only after explicit approval.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/sources-verify.mjs <source-id>');
  process.exit(1);
}

const SOURCE_ID = args[0];

async function main() {
  // Dynamic import to resolve aliases
  const { SOURCES } = await import(join(ROOT, 'content/sources.ts'));
  const { CORPUS } = await import(join(ROOT, 'content/corpus.ts'));

  const source = SOURCES.find((s) => s.id === SOURCE_ID);
  if (!source) {
    console.error(`Source "${SOURCE_ID}" not found in content/sources.ts`);
    console.error(`Available: ${SOURCES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  const passages = CORPUS.filter((p) => p.sourceId === SOURCE_ID);

  // --- Display source metadata ---
  console.log('\n=== SOURCE VERIFICATION GATE ===\n');
  console.log(`ID:            ${source.id}`);
  console.log(`Title:         ${source.title}`);
  console.log(`Authority:     ${source.authority}`);
  console.log(`Document Type: ${source.documentType}`);
  console.log(`Document No:   ${source.documentNumber ?? '(not recorded)'}`);
  console.log(`Date:          ${source.date ?? '(not recorded)'}`);
  console.log(`Effective:     ${source.effectiveDate ?? '(not recorded)'}`);
  console.log(`Superseded:    ${source.supersededDate ?? '(not recorded)'}`);
  console.log(`Source URL:    ${source.sourceUrl ?? '(none)'}`);
  console.log(`Local Path:    ${source.localPath ?? '(none)'}`);
  console.log(`SHA-256:       ${source.sha256 ?? '(not recorded)'}`);
  console.log(`Page Count:    ${source.pageCount ?? '(not recorded)'}`);
  console.log(`Source Class:  ${source.sourceClass}`);
  console.log(`Status:        ${source.status}`);
  console.log(`Verified At:   ${source.verifiedAt ?? '(never)'}`);
  console.log(`Verification:  ${source.verificationMethod ?? '(none)'}`);
  console.log(`Verified Pages:${source.verifiedPages.length > 0 ? ' ' + source.verifiedPages.join(', ') : ' (none)'}`);
  console.log(`Sections:      ${source.sections.join(', ')}`);
  console.log(`Tags:          ${source.tags.join(', ')}`);
  console.log(`\nPassages: ${passages.length}`);
  console.log('---');

  for (const p of passages) {
    console.log(`\n[${p.id}] page=${p.page ?? '?'} section=${p.section ?? '?'} status=${p.status}`);
    console.log(`  text: ${p.text.slice(0, 200)}${p.text.length > 200 ? '…' : ''}`);
  }

  if (passages.length === 0) {
    console.log('\nNo passages found for this source. Nothing to verify.');
    process.exit(0);
  }

  // --- Interactive verification ---
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  console.log('\n=== VERIFICATION PROMPT ===');
  console.log('For each passage, approve (y), reject (n), or skip (s).');
  console.log('Approving a passage sets status=VERIFIED with verificationMethod="manual-primary-document-check".');
  console.log('You must approve at least one passage to proceed.\n');

  const approved: string[] = [];
  const rejected: string[] = [];
  const skipped: string[] = [];

  for (const p of passages) {
    const display = p.text.slice(0, 120).replace(/\n/g, ' ');
    const ans = await ask(`  Approve passage ${p.id} (page ${p.page ?? '?'}) — "${display}"…? [y/n/s]: `);
    const trimmed = ans.trim().toLowerCase();
    if (trimmed === 'y' || trimmed === 'yes') {
      approved.push(p.id);
    } else if (trimmed === 'n' || trimmed === 'no') {
      rejected.push(p.id);
    } else {
      skipped.push(p.id);
    }
  }

  // --- Source-level verification ---
  const sourceAns = await ask('\nApprove source record itself as VERIFIED? [y/N]: ');
  const sourceApproved = sourceAns.trim().toLowerCase() === 'y';

  rl.close();

  // --- Summary ---
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Approved passages: ${approved.length}`);
  console.log(`Rejected passages: ${rejected.length}`);
  console.log(`Skipped passages:  ${skipped.length}`);
  console.log(`Source approved:   ${sourceApproved}`);

  if (approved.length === 0 && !sourceApproved) {
    console.log('\nNo passages approved. Nothing written. Exiting.');
    process.exit(0);
  }

  // --- Confirmation ---
  const confirm = await ask('\nWrite VERIFIED status to content/sources.ts and content/corpus.ts? [y/N]: ');
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('Cancelled. No changes written.');
    process.exit(0);
  }

  // --- Write changes ---
  const now = new Date().toISOString();

  // Update sources.ts
  const sourcesPath = join(ROOT, 'content/sources.ts');
  let sourcesContent = readFileSync(sourcesPath, 'utf8');

  if (sourceApproved) {
    // Update status to VERIFIED, set verifiedAt and verificationMethod
    const statusRegex = new RegExp(`(id: '${source.id}'[\\s\\S]*?status: )'UNVERIFIED'|'DEMO'`);
    sourcesContent = sourcesContent.replace(
      statusRegex,
      `$1'VERIFIED'`,
    );

    // Add verifiedAt
    if (!sourcesContent.includes(`verifiedAt: '${now.substring(0, 10)}'`)) {
      sourcesContent = sourcesContent.replace(
        new RegExp(`(id: '${source.id}'[\\s\\S]*?verificationMethod: )null`),
        `$1'manual-primary-document-check'`,
      );
      // Add verifiedAt after verificationMethod
      sourcesContent = sourcesContent.replace(
        new RegExp(`(verificationMethod: 'manual-primary-document-check',\\s*)`),
        `$1verifiedAt: '${now}',\n`,
      );
    }
  }

  writeFileSync(sourcesPath, sourcesContent);

  // Update corpus.ts
  const corpusPath = join(ROOT, 'content/corpus.ts');
  let corpusContent = readFileSync(corpusPath, 'utf8');

  for (const passageId of approved) {
    // Find the passage and update its status
    const passageRegex = new RegExp(
      `(id: '${passageId}'[\\s\\S]*?status: )'UNVERIFIED'|'DEMO'`,
    );
    corpusContent = corpusContent.replace(
      passageRegex,
      `$1'VERIFIED'`,
    );
  }

  writeFileSync(corpusPath, corpusContent);

  console.log('\nVerification written. Run npm run typecheck && npm test to validate.');
}

main().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});