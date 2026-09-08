/**
 * Retrieval corpus.
 *
 * IMPORTANT: every passage below is a PROJECT SUMMARY (status UNVERIFIED) or
 * DEMO content — NOT a verbatim quote from the primary document. The ASK
 * pipeline surfaces this status on every answer and links to the source so a
 * reader can check the primary document. A maintainer promotes a passage to
 * VERIFIED only after checking it line-by-line against the source PDF and
 * recording the source sha256.
 *
 * This is the anti-hallucination contract: PostalMind never states a rule
 * number, rate, date or order number that is not written here with a citation.
 */

import type { CorpusPassage } from '@/lib/sources/types';

export const CORPUS: CorpusPassage[] = [
  {
    id: 'gds-2020-nature-of-engagement',
    sourceId: 'gds-ce-rules-2020',
    section: 'Nature of engagement',
    page: 3,
    status: 'VERIFIED',
    tags: ['gds', 'status', 'engagement'],
    keywords: ['gds', 'gramin dak sevak', 'status', 'civil service', 'outside the civil service', 'engagement', 'rule 3-a', '5 hours', 'extra departmental'],
    text:
      'Under Rule 3-A of the GDS (Conduct and Engagement) Rules, 2020: a Sevak "shall be outside the Civil Service of the Union" (Rule 3-A(v)); a Sevak "shall not be required to perform duty beyond a maximum period of 5 hours in a day" (Rule 3-A(i)); and a Sevak "shall not claim to be at par with the Central Government employees". Engagement, conduct and disciplinary matters are governed by the 2020 Rules (which supersede the 2011 Rules), not the CCS Rules. Verified against primary document p.3.',
  },
  {
    id: 'gds-2020-working-hours',
    sourceId: 'kamlesh-chandra-committee-2016',
    section: 'Working hours / workload norms',
    page: null,
    status: 'UNVERIFIED',
    tags: ['working-hours', 'workload', 'gds'],
    keywords: ['working hours', 'hours of work', 'workload', 'norms', 'points', 'four hours', 'five hours', 'duty hours'],
    text:
      'The GDS Committee framework moved GDS from a "level of work" system towards defined working-hours norms, with branch post office work assessed to place GDS in working-hour slabs (commonly described as around 4 hours rising to a higher slab). The exact slab, its hours and the resulting TRCA depend on the workload assessment of the specific branch office. Project summary — cite the Committee report and the workload assessment order for a specific office.',
  },
  {
    id: 'trca-2018-structure',
    sourceId: 'dop-trca-order-2018',
    section: 'Revised TRCA structure',
    page: null,
    status: 'VERIFIED',
    tags: ['trca', 'wages', 'gds'],
    keywords: ['trca', 'time related continuity allowance', 'wage', 'salary', 'slab', 'level 1', 'level 2', 'bpm', 'dearness allowance', 'arrears', '2018', '17-31/2016-GDS'],
    text:
      'TRCA (Time Related Continuity Allowance) is the allowance paid to GDS in place of pay. OM No. 17-31/2016-GDS dated 25.06.2018 implements the Kamlesh Chandra committee recommendations: all GDS posts fall in two categories (Branch Postmasters and other than Branch Postmasters) with two working-hour slabs (4 and 5 hours) and two TRCA levels each; the 11 pre-revised slabs merge into 3. Dearness Allowance continues per 7th CPC as a separate component. Revised TRCA and allowances apply w.e.f. 01.07.2018, with arrears for 01.01.2016-30.06.2018 computed at a factor of 2.57. The applicable figure for an individual depends on category and slab — cite the 2018 order and any later DA revision for the current figure; do not state a TRCA amount from memory. Verified against primary OM pp.1-4.',
  },
  {
    id: 'gds-leave-paid-leave',
    sourceId: 'dop-gds-leave-instructions',
    section: 'Paid leave',
    page: null,
    status: 'VERIFIED',
    tags: ['leave', 'paid-leave', 'gds'],
    keywords: ['leave', 'paid leave', 'annual leave', '20 days', '45 days', 'accumulation', 'encashment', 'emergency leave', 'maternity leave', 'leave without allowance', 'rule 7'],
    text:
      'GDS paid leave is governed by Rule 7 of the GDS (Conduct and Engagement) Rules 2020 as amended by OM No. 17-12/2025-GDS dated 30.12.2025 (effective 01.01.2026): 20 days per year credited 10 days per half-year (1 January / 1 July), carry-forward of unavailed leave up to 45 days, credit at 1.67 days per completed calendar month with rounding, and no encashment in any situation — unavailed leave lapses on discharge, death or cessation. Paid leave may be combined with maternity leave or leave without allowance (but not emergency leave) with approval, and Sundays/postal holidays may be prefixed/suffixed. Historically, paid leave was introduced vide Dte OM 17.12.1998 and OM No. 17-136/2001-GDS dated 24.04.2003 bars sanctioning authorities from denying it on combination-of-duties grounds (combination capped at 5 hours/day). Verified against primary OMs.',
  },
  {
    id: 'gds-2020-disciplinary-framework',
    sourceId: 'gds-ce-rules-2020',
    section: 'Disciplinary authority and penalties',
    page: null,
    status: 'VERIFIED',
    tags: ['discipline', 'penalty', 'put-off-duty', 'gds'],
    keywords: ['disciplinary', 'penalty', 'rule 9', 'rule 10', 'rule 12', 'rule 13', 'charge sheet', 'show cause', 'put off duty', 'putoff', 'suspension', 'removal', 'dismissal', 'termination', 'appeal', 'natural justice'],
    text:
      'The 2020 Rules set out the disciplinary framework for GDS. Rule 9 lists minor penalties (censure, debarring from exams/selection, recovery of loss, withholding of TRCA increase, reduction in TRCA slab, compulsory discharge, dismissal) and major penalties (removal, dismissal). Rule 10-A requires a minor penalty to follow written intimation of the proposal and allegations plus an opportunity to represent; Rule 10-B requires major penalties to follow written charges, a reasonable opportunity of being heard, and an inquiry. Rule 12 "Put Off Duty" is a distinct interim measure (ex-gratia compensation at one-quarter of TRCA plus Dearness Allowance), not a penalty. Rule 13 gives a right of appeal within three months of receiving the order. Verified against primary document pp.11-20.',
  },
  {
    id: 'business-targets-nature',
    sourceId: 'kamlesh-chandra-committee-2016',
    section: 'Business development / incentives',
    page: null,
    status: 'UNVERIFIED',
    tags: ['targets', 'incentive', 'rpli', 'business'],
    keywords: ['target', 'business', 'rpli', 'pli', 'ippb', 'incentive', 'canvassing', 'mela', 'marketing', 'productivity'],
    text:
      'Business procurement (RPLI, PLI, IPPB accounts, small savings canvassing) is part of GDS work and is supported by an incentive structure rather than being purely a penal target. Communicating a business target, a review, or a performance expectation is within normal supervision. Whether particular communications cross into sustained pressure, public shaming or threats is a separate, evidence-specific question — see the PostalMind evidence methodology. Project summary.',
  },
  {
    id: 'rti-act-timelines',
    sourceId: 'rti-act-2005',
    section: 'Application and response',
    page: null,
    status: 'VERIFIED',
    tags: ['rti', 'timeline', 'fee', 'appeal'],
    keywords: ['rti', 'application', 'thirty days', '30 days', 'response', 'first appeal', 'second appeal', 'information commission', 'fee', 'pio', 'cpio', 'spio', 'life and liberty', '48 hours', 'section 6', 'section 7', 'section 19'],
    text:
      'Under the RTI Act 2005 (No. 22 of 2005): a request is made in writing or electronically, with the prescribed fee, to the Central/State Public Information Officer (s.6). The CPIO/SPIO must respond within thirty days — within forty-eight hours where the information concerns the life or liberty of a person — and failure to decide in time is deemed refusal (s.7). A first appeal lies within thirty days to the officer senior in rank to the CPIO/SPIO; a second appeal lies within ninety days to the Central or State Information Commission (s.19). Verified against primary Gazette reprint, Gazette pp.7 and 15-16.',
  },
  {
    id: 'posb-rates-must-cite-quarter',
    sourceId: 'nsi-posb-interest-rates',
    section: 'Interest rates',
    page: 1,
    status: 'VERIFIED',
    tags: ['interest-rate', 'posb', 'rd', 'td', 'nsc', 'ssa'],
    keywords: ['interest rate', 'rate of interest', 'rd rate', 'td rate', 'nsc rate', 'ssa rate', 'ppf rate', 'mis rate', 'scss rate', 'quarter', 'current rate', 'unchanged', 'Q2', '2026-27'],
    text:
      'Per MoF (DEA, Budget Division) OM F.No.1/4/2019-NS dated 30.06.2026, small-savings interest rates for Q2 FY2026-27 (01.07.2026-30.09.2026) remain unchanged from Q1 FY2026-27; the Q1 OM of 30.03.2026 likewise holds rates unchanged from Q4 FY2025-26 (chain confirmed via DoP SB Order No. 01/2026). Neither OM carries a numerical rate table, so PostalMind will not state any current rate unless a maintainer has loaded a rate-table notification for that quarter. To give a customer a rate, open the current quarter\u2019s Ministry of Finance notification and read it directly. Verified against primary OMs (Q2 DEA p.1; Q1 SB Order + enclosure).',
  },
  {
    id: 'demo-mela-timeline',
    sourceId: 'demo-mela-scenario',
    section: 'Illustrative timeline',
    page: null,
    status: 'DEMO',
    tags: ['demo', 'mela', 'timeline'],
    keywords: ['mela', 'demo', 'timeline', 'target pressure', 'example', 'scenario'],
    text:
      'DEMO scenario (synthetic, no real data): a branch has a business Mela scheduled. Over the preceding week a supervising official sends repeated messages about the same individual target, including some outside working hours and one comparing the employee to other branches by name in a group. On Mela day a follow-up message asks for figures in the evening. The next day an explanation is demanded. PostalMind treats each message as an evidence item, classifies it (e.g. TARGET_INSTRUCTION, REPEATED_TARGET_PRESSURE, PEER_COMPARISON, AFTER_HOURS_COMMUNICATION), rates its strength, and builds a PRE-EVENT / EVENT-DAY / POST-EVENT timeline — without concluding that any rule was broken.',
  },
];

export const CORPUS_BY_SOURCE = CORPUS.reduce<Record<string, CorpusPassage[]>>((acc, p) => {
  (acc[p.sourceId] ??= []).push(p);
  return acc;
}, {});
