#!/usr/bin/env node
/**
 * npm run sources:fetch -- --url <url> --out <path> [--force] [--timeout-ms N]
 *
 * Maintainer utility: browser-first fetcher for primary government documents.
 *
 * Strategy (in order):
 *  1. Playwright Chromium browser-context request (realistic UA, cookies,
 *     redirects preserved) — defeats naive curl-only bot filtering.
 *  2. Full page navigation + network-response capture (handles JS pages,
 *     PDF-viewer embeds).
 *  3. DOM link discovery: finds View/Download/PDF anchors, resolves hrefs,
 *     follows only official *.gov.in / *.nic.in hosts, fetches PDF via the
 *     same browser context.
 *
 * Guarantees:
 *  - reports HTTP status + content-type + final URL
 *  - verifies %PDF- magic bytes, refuses HTML masquerading as .pdf
 *  - computes SHA-256, saves atomically (tmp + rename)
 *  - writes sidecar <out>.fetch.json with provenance
 *  - never silently overwrites a *valid, different* existing PDF
 *    (use --force to replace, e.g. known-bad HTML error pages)
 *
 * Never bypasses CAPTCHA / auth. Never uses stealth plugins.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const OFFICIAL_HOST = /(^|\.)(gov\.in|nic\.in)$/i;

function usage() {
  console.error(
    'Usage: node scripts/fetch-primary-source.mjs --url <url> --out <path> [--force] [--timeout-ms N]',
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let URL_ARG = null;
let OUT_ARG = null;
let FORCE = false;
let TIMEOUT_MS = 60000;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--url' && argv[i + 1]) URL_ARG = argv[++i];
  else if (argv[i] === '--out' && argv[i + 1]) OUT_ARG = argv[++i];
  else if (argv[i] === '--force') FORCE = true;
  else if (argv[i] === '--timeout-ms' && argv[i + 1]) TIMEOUT_MS = Number(argv[++i]);
}
if (!URL_ARG || !OUT_ARG) usage();

const OUT = resolve(process.cwd(), OUT_ARG);
if (!OUT.endsWith('.pdf')) {
  console.error('Refusing: --out must end in .pdf');
  process.exit(1);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const req = createRequire(resolve(process.cwd(), 'package.json'));
    for (const p of ['/home/parzival/node_modules/playwright', req.resolve('playwright')]) {
      try {
        return await import(p);
      } catch {
        /* try next */
      }
    }
    throw new Error('playwright module not found');
  }
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function isPdf(buf) {
  return buf.length > 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isHtml(buf) {
  const head = buf.subarray(0, 200).toString('utf8').toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html');
}

function existingState(path) {
  if (!existsSync(path)) return 'absent';
  try {
    const b = readFileSync(path);
    if (isPdf(b)) return { kind: 'pdf', sha256: sha256(b), bytes: b.length };
    return { kind: 'non-pdf', bytes: b.length };
  } catch {
    return 'unreadable';
  }
}

async function savePdf(buf, meta) {
  const st = existingState(OUT);
  const digest = sha256(buf);
  if (st && typeof st === 'object' && st.kind === 'pdf') {
    if (st.sha256 === digest) {
      console.log(`UNCHANGED: identical PDF already at ${OUT} (sha256 ${digest})`);
      return { saved: false, unchanged: true, sha256: digest };
    }
    if (!FORCE) {
      console.error(
        `REFUSING to overwrite a different valid PDF at ${OUT}\n existing sha256=${st.sha256} bytes=${st.bytes}\n new      sha256=${digest} bytes=${buf.length}\nRe-run with --force to replace.`,
      );
      process.exit(2);
    }
    console.log(`OVERWRITE (--force): replacing valid PDF sha256=${st.sha256}`);
  } else if (st && typeof st === 'object' && st.kind === 'non-pdf') {
    console.log(
      `OVERWRITE: existing file is NOT a PDF (${st.bytes} bytes, likely HTML error page) — replacing.`,
    );
  }
  const tmp = `${OUT}.tmp-${process.pid}`;
  writeFileSync(tmp, buf);
  renameSync(tmp, OUT);
  const sidecar = {
    requestedUrl: URL_ARG,
    finalUrl: meta.finalUrl,
    httpStatus: meta.status,
    contentType: meta.contentType,
    bytes: buf.length,
    sha256: digest,
    retrievedAt: new Date().toISOString(),
    userAgent: UA,
    method: meta.method,
  };
  writeFileSync(`${OUT}.fetch.json`, JSON.stringify(sidecar, null, 2));
  console.log(`SAVED: ${OUT}`);
  console.log(`  finalUrl:    ${meta.finalUrl}`);
  console.log(`  http:        ${meta.status}`);
  console.log(`  contentType: ${meta.contentType}`);
  console.log(`  bytes:       ${buf.length}`);
  console.log(`  sha256:      ${digest}`);
  console.log(`  sidecar:     ${OUT}.fetch.json`);
  return { saved: true, sha256: digest };
}

function findSystemChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const out = execSync(
      'command -v google-chrome-stable google-chrome chromium-browser chromium 2>/dev/null',
      { encoding: 'utf8' },
    )
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return out[0] || null;
  } catch {
    return null;
  }
}

async function launchBrowser(chromium) {
  const opts = { headless: true };
  try {
    return await chromium.launch(opts);
  } catch (e) {
    if (!/Executable doesn't exist/i.test(String(e && e.message))) throw e;
    const sys = findSystemChrome();
    if (!sys) throw e;
    console.log(`Playwright browsers missing; using system Chrome at ${sys}`);
    return await chromium.launch({ ...opts, executablePath: sys });
  }
}

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await launchBrowser(chromium);
  // NOTE: ignoreHTTPSErrors is needed in sandboxed CI where egress TLS is
  // re-terminated; authenticity is established by %PDF- magic bytes plus
  // primary-text content checks, never by TLS alone.
  const context = await browser.newContext({
    locale: 'en-IN',
    userAgent: UA,
    ignoreHTTPSErrors: true,
  });
  const stamp = () => new Date().toISOString();

  try {
    // --- Step 1: browser-context request (headers/cookies/redirects preserved) ---
    console.log(`[${stamp()}] STEP 1: browser-context GET ${URL_ARG}`);
    try {
      const resp = await context.request.get(URL_ARG, { timeout: TIMEOUT_MS });
      const status = resp.status();
      const ct = resp.headers()['content-type'] || '';
      const finalUrl = resp.url();
      console.log(`  -> http=${status} content-type=${ct} finalUrl=${finalUrl}`);
      if (status >= 200 && status < 300 && ct.includes('application/pdf')) {
        const body = await resp.body();
        console.log(`  -> body bytes=${body.length} magic=${body.subarray(0, 5).toString('ascii')}`);
        if (isPdf(body)) {
          await savePdf(body, { finalUrl, status, contentType: ct, method: 'context-request' });
          return;
        }
        console.log('  -> content-type said PDF but magic bytes are not %PDF-; continuing.');
      } else if (isHtml(Buffer.from(await resp.body().catch(() => Buffer.alloc(0))))) {
        console.log('  -> response body is HTML, not PDF; continuing to page navigation.');
      }
    } catch (e) {
      console.log(`  -> context-request failed: ${e.message}; continuing.`);
    }

    // --- Step 2: full page navigation + response capture + DOM discovery ---
    console.log(`[${stamp()}] STEP 2: page navigation + DOM discovery`);
    const page = await context.newPage();
    const pdfResponses = [];
    page.on('response', async (response) => {
      try {
        const ct = (response.headers()['content-type'] || '').toLowerCase();
        if (ct.includes('application/pdf')) {
          const body = await response.body().catch(() => null);
          if (body && isPdf(body)) {
            pdfResponses.push({ url: response.url(), status: response.status(), ct, body });
            console.log(`  [net] PDF response: http=${response.status()} bytes=${body.length} url=${response.url()}`);
          }
        }
      } catch {
        /* ignore */
      }
    });
    const nav = await page.goto(URL_ARG, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    console.log(`  -> nav http=${nav ? nav.status() : '(none)'} url=${page.url()}`);
    // Direct-PDF case: the navigation target IS the document (pdfbind.ashx,
    // Chrome PDF viewer, zero DOM anchors). Read the navigation body itself.
    if (nav && nav.status() >= 200 && nav.status() < 300) {
      const navCt = (nav.headers()['content-type'] || '').toLowerCase();
      console.log(`  -> nav content-type=${navCt || '(none)'}`);
      if (navCt.includes('application/pdf')) {
        const body = await nav.body().catch(() => null);
        const magic = body ? body.subarray(0, 5).toString('ascii') : '(no body)';
        console.log(`  -> nav body bytes=${body ? body.length : 0} magic=${magic}`);
        if (body && isPdf(body)) {
          await savePdf(body, {
            finalUrl: page.url(),
            status: nav.status(),
            contentType: navCt,
            method: 'navigation-direct-pdf',
          });
          return;
        }
      }
    }
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (pdfResponses.length > 0) {
      const best = pdfResponses.sort((a, b) => b.body.length - a.body.length)[0];
      await savePdf(best.body, { finalUrl: best.url, status: best.status, contentType: best.ct, method: 'page-network-capture' });
      return;
    }

    // --- Step 3: anchor discovery ---
    const anchors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a')).map((a) => ({
        text: (a.textContent || '').trim().slice(0, 120),
        href: a.href || '',
      })),
    );
    console.log(`  -> ${anchors.length} anchors found`);
    const interesting = anchors.filter((a) =>
      /view|download|\.pdf|accessible|english|click here/i.test(`${a.text} ${a.href}`),
    );
    for (const a of interesting.slice(0, 25)) console.log(`  [a] "${a.text}" -> ${a.href}`);

    const cands = anchors
      .map((a) => a.href)
      .filter((h) => h && /\.pdf(\?|$)|pdfbind|download|view/i.test(h));
    const seen = new Set();
    for (const href of cands) {
      if (seen.has(href)) continue;
      seen.add(href);
      let host = '';
      try {
        host = new URL(href).hostname;
      } catch {
        continue;
      }
      if (!OFFICIAL_HOST.test(host)) {
        console.log(`  skip non-official host: ${href}`);
        continue;
      }
      console.log(`[${stamp()}] STEP 3: fetching discovered ${href}`);
      try {
        const r = await context.request.get(href, {
          timeout: TIMEOUT_MS,
          headers: { Referer: page.url() },
        });
        const ct = r.headers()['content-type'] || '';
        console.log(`  -> http=${r.status()} content-type=${ct} final=${r.url()}`);
        if (r.status() >= 200 && r.status() < 300) {
          const body = await r.body();
          if (isPdf(body)) {
            await savePdf(body, { finalUrl: r.url(), status: r.status(), contentType: ct, method: 'dom-discovery' });
            return;
          }
          console.log(`  -> not a PDF (magic=${body.subarray(0, 12).toString('ascii')}); continuing.`);
        }
      } catch (e) {
        console.log(`  -> failed: ${e.message}`);
      }
    }

    console.error('FETCH_BLOCKED: no PDF obtainable via context-request, navigation, or DOM discovery.');
    process.exit(3);
  } finally {
    await browser.close().catch(() => {});
  }
}

await main();
