import { describe, expect, it } from 'vitest';
import {
  emptyMelaTemplate,
  MELA_CASE_ID,
  MELA_EVENT_DATE,
  melaNeutralityCheck,
  summarizeMelaTemplate,
  validateMelaTemplate,
} from '@/lib/evidence/mela-template';

describe('mela-template (template only, no real PII)', () => {
  it('uses the fixed case id and event date', () => {
    const t = emptyMelaTemplate();
    expect(t.caseId).toBe(MELA_CASE_ID);
    expect(t.eventDate).toBe(MELA_EVENT_DATE);
    expect(MELA_CASE_ID).toBe('PM-GDS-MELA-2026-09-10');
    expect(MELA_EVENT_DATE).toBe('2026-09-10');
  });

  it('covers PRE-EVENT / EVENT-DAY / POST-EVENT sections', () => {
    const t = emptyMelaTemplate();
    expect(Object.keys(t.preEvent)).toEqual(
      expect.arrayContaining([
        'instructionDate',
        'instructionSourceRole',
        'assignedProduct',
        'assignedTarget',
        'peerComparison',
        'inspectionReference',
        'leaveReference',
        'threatLikeWording',
        'employeeResponse',
        'contextBeforeAfter',
      ]),
    );
    expect(Object.keys(t.eventDay)).toEqual(
      expect.arrayContaining(['startTime', 'assignedActivity', 'actualAchievement', 'endTime', 'afterHoursFollowUp']),
    );
    expect(Object.keys(t.postEvent)).toEqual(
      expect.arrayContaining(['explanationDemanded', 'showCauseReference', 'subsequentAdministrativeAction']),
    );
  });

  it('reports missing minimum facts', () => {
    const t = emptyMelaTemplate();
    const v = validateMelaTemplate(t);
    expect(v.ok).toBe(false);
    expect(v.missing.length).toBeGreaterThan(0);
    t.preEvent.instructionDate = '2026-09-03';
    t.preEvent.assignedProduct = 'RPLI';
    t.preEvent.assignedTarget = '8 proposals';
    t.eventDay.startTime = '10:00';
    t.eventDay.assignedActivity = 'Mela counter duty';
    t.eventDay.actualAchievement = '5 proposals';
    t.eventDay.endTime = '18:00';
    expect(validateMelaTemplate(t).ok).toBe(true);
  });

  it('flags legal-conclusion language, accepts neutral wording', () => {
    const t = emptyMelaTemplate();
    expect(melaNeutralityCheck(t).neutral).toBe(true);
    t.preEvent.threatLikeWording = 'Repeated individual performance pressure over the same target.';
    expect(melaNeutralityCheck(t).neutral).toBe(true);
    t.preEvent.threatLikeWording = 'This proves illegal harassment by the supervisor.';
    const flagged = melaNeutralityCheck(t);
    expect(flagged.neutral).toBe(false);
    expect(flagged.flagged.join(' ')).toMatch(/preEvent/);
  });

  it('summary never states a legal finding', () => {
    const t = emptyMelaTemplate();
    expect(summarizeMelaTemplate(t)).toMatch(/does not establish/i);
  });

  it('template source contains no phone-like identifiers', () => {
    // Guard against accidental real PII in the template module itself.
    const t = JSON.stringify(emptyMelaTemplate());
    expect(t).not.toMatch(/[6-9]\d{9}/);
  });
});
