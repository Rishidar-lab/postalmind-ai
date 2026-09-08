/**
 * Deterministic RTI application draft generator.
 *
 * No language model. Given structured inputs, it produces a properly
 * formatted application under the RTI Act 2005 with the standard clauses,
 * placeholders for anything not supplied, and the statutory reminders.
 * The user reviews and files it.
 */

export interface RTIInput {
  applicantName: string;
  address: string;
  phone?: string;
  email?: string;
  pioDesignation: string; // "The Public Information Officer"
  publicAuthority: string; // "O/o the Superintendent of Post Offices, <Division>"
  authorityAddress?: string;
  subject: string;
  /** Each a specific, answerable question. */
  queries: string[];
  periodFrom?: string;
  periodTo?: string;
  isBPL?: boolean;
  preferredDelivery?: 'post' | 'email' | 'certified copies';
  place?: string;
  date?: string; // ISO
}

export interface RTIDraft {
  text: string;
  warnings: string[];
  checklist: string[];
}

function ph(v: string | undefined, placeholder: string): string {
  return v && v.trim() ? v.trim() : `[${placeholder}]`;
}

export function generateRTIDraft(input: RTIInput): RTIDraft {
  const warnings: string[] = [];
  const queries = (input.queries ?? []).map((q) => q.trim()).filter(Boolean);

  if (queries.length === 0) warnings.push('No questions provided — add at least one specific, answerable question.');
  for (const q of queries) {
    if (/\bwhy\b/i.test(q) || /\bopinion\b/i.test(q)) {
      warnings.push(`"${q.slice(0, 60)}…" — RTI covers information held on record, not reasons/opinions. Rephrase to ask for the record (e.g. "a copy of the note/order").`);
    }
  }
  if (!input.periodFrom && !input.periodTo) {
    warnings.push('No period specified — a date range helps the PIO locate the records and reduces "diversionary" rejections.');
  }

  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const delivery =
    input.preferredDelivery === 'email'
      ? 'by email to the address given above'
      : input.preferredDelivery === 'certified copies'
        ? 'as certified photocopies by registered post'
        : 'by post to the address given above';

  const feeLine = input.isBPL
    ? 'I am a person below the poverty line. A copy of my BPL card / certificate is enclosed. As per Section 7(5) of the RTI Act, no fee is payable.'
    : 'The application fee of Rs. 10 is enclosed by way of [Indian Postal Order / Demand Draft / cash receipt] in favour of the Accounts Officer of the public authority. I undertake to pay the additional fee for photocopies as intimated under Section 7(3).';

  const queryBlock = queries.length
    ? queries.map((q, i) => `${i + 1}. ${q.endsWith('?') || q.endsWith('.') ? q : q + '.'}`).join('\n')
    : '1. [State your first specific question here.]\n2. [State your second specific question here.]';

  const periodLine =
    input.periodFrom || input.periodTo
      ? `The information sought relates to the period ${ph(input.periodFrom, 'from date')} to ${ph(input.periodTo, 'to date')}.`
      : '';

  const text = `To
${ph(input.pioDesignation, 'The Public Information Officer')}
${ph(input.publicAuthority, 'Name of the public authority / office')}
${ph(input.authorityAddress, 'Office address')}

Subject: Application under the Right to Information Act, 2005 — ${ph(input.subject, 'brief subject')}

Sir/Madam,

Under Section 6(1) of the Right to Information Act, 2005, I request the following information held by or under the control of your public authority:

${queryBlock}

${periodLine}

Manner in which information is required: I request that the information be provided ${delivery}.

Fee: ${feeLine}

Timeline: I note that under Section 7(1) the information is to be provided within 30 days of receipt of this application (within 48 hours where it concerns the life or liberty of a person), and that under Section 7(2) failure to respond within the prescribed period is deemed a refusal.

Applicant details:
Name: ${ph(input.applicantName, 'Full name')}
Address: ${ph(input.address, 'Postal address')}
${input.phone ? `Phone: ${input.phone}\n` : ''}${input.email ? `Email: ${input.email}\n` : ''}
I am a citizen of India. This information is sought for my own use and I am not seeking information that is exempt under Section 8 or Section 9. If any part of this request is held to be exempt, I request that the remaining information be provided under Section 10(1) (severability).

Place: ${ph(input.place, 'Place')}
Date: ${date}

(Signature)
${ph(input.applicantName, 'Full name')}

Enclosures:
1. Proof of fee / BPL certificate as applicable.
`;

  const checklist = [
    'Address it to the PIO of the office that actually holds the records (not "India Post" generally).',
    'Keep each question specific and answerable from a record — ask for copies of notes/orders/registers, not for reasons.',
    'Enclose the Rs. 10 fee (IPO / DD / cash), unless you are BPL with proof.',
    'Send by registered post or Speed Post and keep the receipt and a copy of the application.',
    'If no reply in 30 days, or you are dissatisfied, file a First Appeal to the First Appellate Authority within 30 days; then a Second Appeal to the Central Information Commission.',
  ];

  return { text, warnings, checklist };
}
