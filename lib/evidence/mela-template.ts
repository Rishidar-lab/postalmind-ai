/**
 * Mela case template — PM-GDS-MELA-2026-09-10.
 *
 * TEMPLATE ONLY. No real employee names, messages, phone numbers or facility
 * IDs belong here (or anywhere in source). The analyst fills this in on their
 * own device; the filled record lives in IndexedDB, never in the repo.
 *
 * Analytical neutrality is structural: every section records observable facts
 * (who said what, when, in which channel). There is deliberately NO field for
 * a legal conclusion. Wording guidance uses "repeated individual performance
 * pressure", never "illegal harassment", unless an authoritative source is
 * attached separately.
 */

export const MELA_CASE_ID = 'PM-GDS-MELA-2026-09-10';
export const MELA_EVENT_DATE = '2026-09-10';
export const MELA_EVENT_LABEL = 'Business / Mela Target Event';

export interface MelaPreEvent {
  instructionDate: string;
  instructionSourceRole: string;
  writtenOrVerbal: '' | 'written' | 'verbal' | 'both' | 'unknown';
  assignedProduct: string;
  assignedTarget: string;
  targetBasis: string;
  reportingRequirement: string;
  normalDutyHours: string;
  targetRelatedMessages: string;
  peerComparison: string;
  publicNamingOrRanking: string;
  inspectionReference: string;
  leaveReference: string;
  threatLikeWording: string;
  employeeResponse: string;
  contextBeforeAfter: string;
}

export interface MelaEventDay {
  startTime: string;
  assignedActivity: string;
  customerResponse: string;
  actualAchievement: string;
  revisedTarget: string;
  supervisoryInstructions: string;
  peerComparison: string;
  comments: string;
  endTime: string;
  afterHoursFollowUp: string;
}

export interface MelaPostEvent {
  performanceFollowUp: string;
  explanationDemanded: string;
  inspectionReference: string;
  leaveConsequence: string;
  showCauseReference: string;
  repeatedCommunication: string;
  subsequentAdministrativeAction: string;
}

export interface MelaTemplate {
  caseId: typeof MELA_CASE_ID;
  eventDate: typeof MELA_EVENT_DATE;
  preEvent: MelaPreEvent;
  eventDay: MelaEventDay;
  postEvent: MelaPostEvent;
  analystNotes: string;
  updatedAt: string | null;
}

export function emptyMelaTemplate(): MelaTemplate {
  const emptyPre: MelaPreEvent = {
    instructionDate: '',
    instructionSourceRole: '',
    writtenOrVerbal: '',
    assignedProduct: '',
    assignedTarget: '',
    targetBasis: '',
    reportingRequirement: '',
    normalDutyHours: '',
    targetRelatedMessages: '',
    peerComparison: '',
    publicNamingOrRanking: '',
    inspectionReference: '',
    leaveReference: '',
    threatLikeWording: '',
    employeeResponse: '',
    contextBeforeAfter: '',
  };
  const emptyDay: MelaEventDay = {
    startTime: '',
    assignedActivity: '',
    customerResponse: '',
    actualAchievement: '',
    revisedTarget: '',
    supervisoryInstructions: '',
    peerComparison: '',
    comments: '',
    endTime: '',
    afterHoursFollowUp: '',
  };
  const emptyPost: MelaPostEvent = {
    performanceFollowUp: '',
    explanationDemanded: '',
    inspectionReference: '',
    leaveConsequence: '',
    showCauseReference: '',
    repeatedCommunication: '',
    subsequentAdministrativeAction: '',
  };
  return {
    caseId: MELA_CASE_ID,
    eventDate: MELA_EVENT_DATE,
    preEvent: emptyPre,
    eventDay: emptyDay,
    postEvent: emptyPost,
    analystNotes: '',
    updatedAt: null,
  };
}

/** Required facts for a minimally useful template (all observable, none conclusory). */
const REQUIRED_PRE: Array<keyof MelaPreEvent> = ['instructionDate', 'assignedProduct', 'assignedTarget'];
const REQUIRED_DAY: Array<keyof MelaEventDay> = ['startTime', 'assignedActivity', 'actualAchievement', 'endTime'];

export function validateMelaTemplate(t: MelaTemplate): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const k of REQUIRED_PRE) if (!t.preEvent[k].trim()) missing.push(`preEvent.${k}`);
  for (const k of REQUIRED_DAY) if (!t.eventDay[k].trim()) missing.push(`eventDay.${k}`);
  return { ok: missing.length === 0, missing };
}

/**
 * Neutrality guard: rejects legal-conclusion language in free-text fields.
 * Returns offending field paths (empty = neutral wording).
 */
const BANNED_CONCLUSIONS = [
  /illegal\s+harassment/i,
  /\bharassment\b.*\b(proved|proven|established|illegal)\b/i,
  /\bmisconduct\b.*\b(proved|proven|established)\b/i,
  /\bcriminal\b.*\b(guilt|conviction|proved)\b/i,
];

export function melaNeutralityCheck(t: MelaTemplate): { neutral: boolean; flagged: string[] } {
  const flagged: string[] = [];
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== 'string') continue;
      for (const re of BANNED_CONCLUSIONS) {
        if (re.test(v)) {
          flagged.push(`${prefix}.${k}`);
          break;
        }
      }
    }
  };
  walk(t.preEvent as unknown as Record<string, unknown>, 'preEvent');
  walk(t.eventDay as unknown as Record<string, unknown>, 'eventDay');
  walk(t.postEvent as unknown as Record<string, unknown>, 'postEvent');
  if (typeof t.analystNotes === 'string') {
    for (const re of BANNED_CONCLUSIONS) {
      if (re.test(t.analystNotes)) {
        flagged.push('analystNotes');
        break;
      }
    }
  }
  return { neutral: flagged.length === 0, flagged };
}

/** Neutral one-paragraph summary: what is recorded, and what is NOT concluded. */
export function summarizeMelaTemplate(t: MelaTemplate): string {
  const v = validateMelaTemplate(t);
  const filled = [t.preEvent.assignedProduct, t.preEvent.assignedTarget, t.eventDay.actualAchievement]
    .filter(Boolean)
    .join(' · ');
  return [
    `Template for ${t.caseId} (event ${t.eventDate}).`,
    filled ? `Recorded so far: ${filled}.` : 'No facts recorded yet.',
    v.ok ? 'Minimum facts present.' : `Missing: ${v.missing.join(', ')}.`,
    'This template records communications and their context. It does not establish harassment, misconduct, retaliation or illegality.',
  ].join(' ');
}
