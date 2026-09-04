/**
 * Source registry.
 *
 * These are metadata records pointing at authoritative documents. The full
 * documents are NOT bundled — `sourceUrl` is the primary reference. A
 * maintainer adds a local mirror (`localPath` + `sha256`) and flips passages
 * to VERIFIED after checking them against the primary document.
 *
 * URLs are best-effort references to official publications. If a link rots,
 * the citation (title + authority + date) still lets a reader find it.
 */

import type { SourceRecord } from '@/lib/sources/types';

const NOW = '2026-09-04T00:00:00Z';

export const SOURCES: SourceRecord[] = [
  {
    id: 'gds-ce-rules-2020',
    title: 'Gramin Dak Sevaks (Conduct and Engagement) Rules, 2020',
    authority: 'Department of Posts, Ministry of Communications, Government of India',
    documentType: 'RULE',
    date: '2020-06-18',
    effectiveDate: '2020-06-18',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['gds', 'conduct', 'engagement', 'discipline', 'service-conditions'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'The principal rules governing engagement, conduct, put-off duty, disciplinary action, and service conditions of Gramin Dak Sevaks. Notified 2020, superseding the 2011 rules.',
  },
  {
    id: 'kamlesh-chandra-committee-2016',
    title: 'Report of the One-Man Committee on Gramin Dak Sevaks (Shri Kamlesh Chandra Committee)',
    authority: 'Department of Posts, Government of India',
    documentType: 'GUIDANCE_NOTE',
    date: '2016-11-24',
    effectiveDate: null,
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['gds', 'wages', 'trca', 'allowances', 'committee'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'Committee report that recommended the revised wage/TRCA structure, working-hours norms and allowances for GDS; basis for the 2018 implementation order.',
  },
  {
    id: 'dop-trca-order-2018',
    title:
      'Implementation of recommendations of the GDS Committee — revised Time Related Continuity Allowance (TRCA)',
    authority: 'Department of Posts, GDS Section',
    documentType: 'TRCA_ORDER',
    date: '2018-06-25',
    effectiveDate: '2018-07-01',
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['trca', 'wages', 'gds', 'allowances', 'arrears'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'Directorate order implementing the revised TRCA slabs for GDS with effect from 1 July 2018, including the two-level TRCA structure and dearness allowance linkage.',
  },
  {
    id: 'dop-gds-leave-instructions',
    title: 'Leave rules applicable to Gramin Dak Sevaks (consolidated instructions)',
    authority: 'Department of Posts',
    documentType: 'LEAVE_INSTRUCTION',
    date: null,
    effectiveDate: null,
    sourceUrl: 'https://www.indiapost.gov.in/VAS/Pages/GraminDakSevaks.aspx',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['leave', 'gds', 'paid-leave', 'emergency-leave', 'maternity-leave'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'Consolidated departmental instructions on leave entitlement for GDS (paid leave, leave accumulation, maternity leave, leave without allowance). Individual OMs should be cited for specific entitlements.',
  },
  {
    id: 'nsi-posb-interest-rates',
    title: 'Small Savings (POSB, RD, TD, MIS, NSC, SSA, SCSS, PPF) interest rates — quarterly notification',
    authority: 'Department of Economic Affairs (Budget Division), Ministry of Finance',
    documentType: 'FINANCIAL_PRODUCT_DOC',
    date: null,
    effectiveDate: null,
    sourceUrl: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=181',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['posb', 'rd', 'td', 'mis', 'nsc', 'ssa', 'ppf', 'interest-rate', 'ippb'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'Small savings interest rates are notified by the Ministry of Finance every quarter. Always cite the notification for the specific quarter — rates change and must never be stated from memory.',
  },
  {
    id: 'rti-act-2005',
    title: 'The Right to Information Act, 2005',
    authority: 'Government of India',
    documentType: 'RULE',
    date: '2005-06-15',
    effectiveDate: '2005-10-12',
    sourceUrl: 'https://rti.gov.in/',
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'UNVERIFIED',
    tags: ['rti', 'transparency', 'application', 'first-appeal', 'fee'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'The RTI Act 2005 — application procedure, statutory response timelines, fee, exemptions, first appeal and second appeal to the Information Commission.',
  },
  {
    id: 'demo-mela-scenario',
    title: 'DEMO: Business/Mela target pressure scenario (synthetic)',
    authority: 'PostalMind AI (illustrative only)',
    documentType: 'GUIDANCE_NOTE',
    date: '2026-09-04',
    effectiveDate: null,
    sourceUrl: null,
    localPath: null,
    sha256: null,
    pageCount: null,
    status: 'DEMO',
    tags: ['demo', 'mela', 'target-pressure', 'workplace'],
    createdAt: NOW,
    updatedAt: NOW,
    summary:
      'Synthetic scenario material used to demonstrate the evidence workflow. Contains no real names, messages or identifiers.',
  },
];

export const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));
