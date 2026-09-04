#!/usr/bin/env node
/**
 * npm run content:check
 *
 * Lightweight, dependency-free static checks for campaign content
 * (content/linkedin/*.md). Deliberately simple regex/heuristic checks, not
 * an NLP system — this is a floor, not a substitute for a human reading
 * every post against docs/PUBLIC-EVIDENCE-STANDARD.md before publishing.
 *
 * Checks:
 *  - missing source status (no "SOURCE NOTES" section, or no recognised
 *    source-class label in it)
 *  - unsupported absolute language ("all officers", "proves that", "always", …)
 *  - missing qualification (mentions death/suicide/harassment with no
 *    qualifying word anywhere in the file — alleged, reported, unverified, …)
 *  - missing independence disclaimer where the post template requires one
 *  - missing "RISK / QUALIFICATION NOTES" section
 *  - obvious PII patterns (phone-shaped, Aadhaar-shaped, email)
 *
 * Exit code 0 = no findings. Exit code 1 = at least one finding (CI-friendly).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'content', 'linkedin');

// These files don't follow the per-post template (title/hook/post/source
// notes/risk notes) so the template-shaped checks don't apply to them.
const NON_TEMPLATE_FILES = new Set(['README.md', 'profile.md']);

const ABSOLUTE_PHRASES = [
  /\ball officers\b/i,
  /\ball (?:mos?|supervisors|superintendents|departmental staff)\b/i,
  /india post kills/i,
  /\bproves?\s+(?:that|it)\b/i,
  /\bcaused\s+(?:the\s+)?(?:death|suicide|harm)\b/i,
  /\b100%\b/i,
  /\bevery single\b/i,
  /\balways\b/i,
  /\bnever fails?\b/i,
  /\bguaranteed?\b/i,
];

const CAUSATION_TRIGGERS = [/\bdeath\b/i, /\bdied\b/i, /\bsuicide\b/i, /\bharassment\b/i, /\bkilled\b/i];

const QUALIFIERS = [
  /\balleg(?:ed|es|ation|ations)\b/i,
  /\breported(?:ly)?\b/i,
  /\bhas not been\b/i,
  /\bnot\s+(?:yet\s+)?(?:been\s+)?(?:judicially\s+)?(?:established|verified|proven)\b/i,
  /\bunverified\b/i,
  /\ballegedly\b/i,
];

const SOURCE_CLASS_LABELS = [
  'PRIMARY OFFICIAL FACT',
  'PRIMARY JUDICIAL FACT',
  'NEWS REPORT',
  'UNION ALLEGATION',
  'EMPLOYEE TESTIMONY',
  'POLICE/FIR REPORTED',
  'FIR REPORTED',
  'UNVERIFIED CLAIM',
  'UNVERIFIED',
  'DEMO',
  'STATUS STATEMENT',
  'EDITORIAL PROPOSAL',
  'SYNTHESIS',
  'TOOLING DESCRIPTION',
];

const DISCLAIMER_PATTERNS = [/independent project/i, /not affiliated with or endorsed by india post/i];

// Obvious, cheap patterns only — not a real PII detector (see lib/evidence/pii.ts for that).
const PII_PATTERNS = [
  { name: 'Indian mobile-shaped number', re: /\b[6-9]\d{9}\b/ },
  { name: 'Aadhaar-shaped number', re: /\b\d{4}[ -]\d{4}[ -]\d{4}\b/ },
  { name: 'email address', re: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i },
];

function checkFile(name, content) {
  const findings = [];
  const isTemplateFile = !NON_TEMPLATE_FILES.has(name);

  if (isTemplateFile) {
    if (!/##\s*SOURCE NOTES/i.test(content)) {
      findings.push('missing source status: no "SOURCE NOTES" section');
    } else {
      const upper = content.toUpperCase();
      const hasLabel = SOURCE_CLASS_LABELS.some((l) => upper.includes(l));
      if (!hasLabel) findings.push('SOURCE NOTES section present but no recognised source-class label found in it');
    }
    if (!DISCLAIMER_PATTERNS.every((p) => p.test(content))) {
      findings.push('missing disclaimer: expected "Independent project... not affiliated with or endorsed by India Post"');
    }
    if (!/##\s*RISK\s*\/\s*QUALIFICATION NOTES/i.test(content)) {
      findings.push('missing "RISK / QUALIFICATION NOTES" section');
    }
  }

  for (const re of ABSOLUTE_PHRASES) {
    if (re.test(content)) findings.push(`unsupported absolute language matching /${re.source}/`);
  }

  const hasCausationTrigger = CAUSATION_TRIGGERS.some((re) => re.test(content));
  const hasQualifier = QUALIFIERS.some((re) => re.test(content));
  if (hasCausationTrigger && !hasQualifier) {
    findings.push('missing qualification: mentions death/suicide/harassment with no qualifying word (alleged, reported, unverified, …) anywhere in the file');
  }

  for (const { name: label, re } of PII_PATTERNS) {
    if (re.test(content)) findings.push(`possible PII pattern found: ${label}`);
  }

  return findings;
}

function main() {
  let files;
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  } catch {
    console.error(`content:check — directory not found: ${DIR}`);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    console.log(`content:check — no .md files found in ${DIR}`);
    return;
  }

  let totalFindings = 0;
  for (const file of files.sort()) {
    const content = readFileSync(join(DIR, file), 'utf8');
    const findings = checkFile(file, content);
    if (findings.length === 0) {
      console.log(`OK    ${file}`);
    } else {
      totalFindings += findings.length;
      console.log(`FAIL  ${file}`);
      for (const f of findings) console.log(`        - ${f}`);
    }
  }

  console.log('');
  if (totalFindings === 0) {
    console.log(`content:check — ${files.length} file(s) checked, 0 findings.`);
  } else {
    console.log(
      `content:check — ${files.length} file(s) checked, ${totalFindings} finding(s). ` +
        'This is a mechanical floor, not a substitute for a human review against docs/PUBLIC-EVIDENCE-STANDARD.md.',
    );
    process.exitCode = 1;
  }
}

main();
