/**
 * SYNTHETIC WhatsApp export for the demo Mela case (PM-GDS-MELA-2026-09-10).
 *
 * Every name, number and message here is invented for demonstration. It does
 * NOT reproduce any real conversation, person or branch office. Phone numbers
 * use the reserved-style prefix and are not real.
 *
 * It is written to exercise the parser and classifier: it mixes English,
 * Tamil and Tanglish, has a multiline message, a media line, a deleted
 * message, and a supervisor whose messages escalate over the week before a
 * business Mela, plus one clearly supportive (counter-evidence) message.
 */

export const DEMO_WHATSAPP_EXPORT = `03/09/2026, 09:02 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
03/09/2026, 09:05 - Mail Overseer: Good morning all. Sub-division business Mela is on 10/09/2026 at the block office.
03/09/2026, 09:06 - Mail Overseer: Each BO must bring RPLI proposals. This BO target is 8 proposals for the Mela.
03/09/2026, 09:12 - ABPM Sevveri: Noted sir. I will start canvassing today.
04/09/2026, 15:10 - Mail Overseer: RPLI progress? Only 1 proposal entered from your BO. Others have done 4-5 already.
04/09/2026, 15:22 - ABPM Sevveri: Sir today I was on delivery beat till 2, could meet only 2 customers
04/09/2026, 21:15 - Mail Overseer: This is not acceptable. Complete at least 3 more by tomorrow without fail.
05/09/2026, 10:40 - Mail Overseer: <Media omitted>
05/09/2026, 10:41 - Mail Overseer: See this ranking sheet. Sevveri BO is at the bottom. Only you are pulling the section down.
05/09/2026, 13:20 - ABPM Sevveri: Sir I am trying. Many customers want to think about it.
06/09/2026, 19:30 - Mail Overseer: எத்தனை முறை சொல்வது? இலக்கு உடனே முடிக்கணும். இல்லைனா explanation கேட்பேன்.
07/09/2026, 10:10 - Mail Overseer: Inspection by ASP may also happen around Mela day, keep BO records ready.
08/09/2026, 20:05 - Mail Overseer: Sunday also please visit 4-5 houses for RPLI. Mela is close.
08/09/2026, 20:06 - ABPM Sevveri: ok sir
09/09/2026, 17:45 - Mail Overseer: Final position tomorrow morning. If target not met I will have to mention it in the Mela report.
09/09/2026, 18:30 - Mail Overseer: This message was deleted
10/09/2026, 07:30 - Mail Overseer: All the best for the Mela today. Reach block office by 10.
10/09/2026, 18:20 - Mail Overseer: How many RPLI did Sevveri close at the Mela? Send figure now.
10/09/2026, 18:22 - ABPM Sevveri: Sir 5 proposals closed, 3 more customers said they will come to BO this week
10/09/2026, 19:50 - Mail Overseer: You did well at the counter today, take rest. We will follow up the remaining this week, no problem.
11/09/2026, 09:15 - Mail Overseer: Please submit a written explanation for not achieving the full Mela target of 8.
`;

/** Alias map used in the demo — supervisor and employee both get role labels. */
export const DEMO_ALIASES: Record<string, string> = {
  'Mail Overseer': 'Supervising Official (Mail Overseer)',
  'ABPM Sevveri': 'Subject Employee (ABPM)',
};
