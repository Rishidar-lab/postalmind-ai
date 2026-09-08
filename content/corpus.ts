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
    page: null,
    status: 'UNVERIFIED',
    tags: ['gds', 'status', 'engagement'],
    keywords: ['gds', 'gramin dak sevak', 'status', 'civil servant', 'holder of civil post', 'engagement', 'extra departmental'],
    text:
      'Gramin Dak Sevaks are engaged by the Department of Posts under a distinct set of rules and are held to be outside the regular civil service establishment (they are not treated as holders of civil posts in the same way as departmental employees). Their engagement, conduct and disciplinary matters are governed by the GDS (Conduct and Engagement) Rules, 2020 rather than the CCS Rules. Project summary — verify against the notified 2020 Rules before relying on this for a service matter.',
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
    status: 'UNVERIFIED',
    tags: ['trca', 'wages', 'gds'],
    keywords: ['trca', 'time related continuity allowance', 'wage', 'salary', 'slab', 'level 1', 'level 2', 'dearness allowance', 'arrears', '2018'],
    text:
      'TRCA (Time Related Continuity Allowance) is the monthly allowance paid to GDS in place of pay. The 2018 order implemented a revised TRCA with a simplified two-level structure (a lower and a higher level) linked to dearness allowance, effective 1 July 2018, with arrears for the intervening period. The applicable figure for an individual depends on their category (BPM / ABPM / Dak Sevak) and working-hour slab. Project summary — cite the 2018 order and any later DA revision for the current figure; do not state a TRCA amount from memory.',
  },
  {
    id: 'gds-leave-paid-leave',
    sourceId: 'dop-gds-leave-instructions',
    section: 'Paid leave',
    page: null,
    status: 'UNVERIFIED',
    tags: ['leave', 'paid-leave', 'gds'],
    keywords: ['leave', 'paid leave', 'annual leave', 'accumulation', 'encashment', 'emergency leave', 'casual leave'],
    text:
      'GDS are entitled to paid leave under departmental instructions (historically calculated on a per-year basis and creditable to a leave account, with a ceiling on accumulation and provision for encashment on discharge). Maternity leave and leave without allowance are separately provided. The specific number of days and current ceilings must be cited from the relevant OM. Project summary — verify entitlement and ceiling against the current leave instruction before advising.',
  },
  {
    id: 'gds-2020-disciplinary-framework',
    sourceId: 'gds-ce-rules-2020',
    section: 'Disciplinary authority and penalties',
    page: null,
    status: 'UNVERIFIED',
    tags: ['discipline', 'penalty', 'put-off-duty', 'gds'],
    keywords: ['disciplinary', 'penalty', 'charge sheet', 'show cause', 'put off duty', 'putoff', 'suspension', 'removal', 'termination', 'appeal', 'natural justice'],
    text:
      'The 2020 Rules set out the disciplinary framework for GDS: the authorities competent to impose penalties, the categories of penalty (minor and major), the requirement of a written charge, an opportunity to respond, and an appeal. "Put off duty" is a distinct measure from penalty. Any disciplinary consequence must follow the procedure in the Rules. Project summary — cite the specific rule for the authority, penalty or procedure in question.',
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
    status: 'UNVERIFIED',
    tags: ['rti', 'timeline', 'fee', 'appeal'],
    keywords: ['rti', 'application', 'thirty days', '30 days', 'response', 'first appeal', 'second appeal', 'information commission', 'fee', 'pio', 'life and liberty', '48 hours'],
    text:
      'Under the RTI Act 2005 an application is made to the Public Information Officer (PIO) of the public authority with the prescribed fee. The PIO is required to respond within 30 days (48 hours where the information concerns life and liberty). If the applicant is dissatisfied or receives no reply, a first appeal lies to the designated First Appellate Authority within the public authority, and thereafter a second appeal to the Central Information Commission. Project summary — cite the specific section (e.g. s.6, s.7, s.19) for the point relied on.',
  },
  {
    id: 'posb-rates-must-cite-quarter',
    sourceId: 'nsi-posb-interest-rates',
    section: 'Interest rates',
    page: null,
    status: 'UNVERIFIED',
    tags: ['interest-rate', 'posb', 'rd', 'td', 'nsc', 'ssa'],
    keywords: ['interest rate', 'rate of interest', 'rd rate', 'td rate', 'nsc rate', 'ssa rate', 'ppf rate', 'mis rate', 'scss rate', 'quarter', 'current rate'],
    text:
      'Small savings interest rates (RD, TD, MIS, NSC, SSA/Sukanya, SCSS, PPF, POSB savings) are revised by the Ministry of Finance every quarter and published as a notification. PostalMind will not state a current rate unless a maintainer has loaded the notification for that quarter. To give a customer a rate, open the current quarter’s Ministry of Finance notification (linked from the source record) and read it directly.',
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
