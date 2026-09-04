/**
 * Deterministic text diff for the Rule Change Tracker (/changes).
 *
 * Word-level LCS diff — no dependency, no AI. "Do not allow AI to invent
 * differences. Use deterministic text comparison first, AI explanation
 * second" — this module is the deterministic-first part; there is no
 * AI-generated diff anywhere in this codebase.
 */

export interface DiffSegment {
  type: 'same' | 'added' | 'removed';
  text: string;
}

/** Splits into words and whitespace runs so segments reconstruct exactly. */
function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? [];
}

/**
 * Word-level diff via the standard LCS backtrack. O(n*m) — fine for the
 * passage-length text (a paragraph to a page) this tool is meant for, not
 * for diffing entire PDFs.
 */
export function diffText(oldText: string, newText: string): DiffSegment[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i++;
    } else {
      push('added', b[j]);
      j++;
    }
  }
  while (i < n) {
    push('removed', a[i]);
    i++;
  }
  while (j < m) {
    push('added', b[j]);
    j++;
  }
  return segments;
}

export interface DiffSummary {
  addedWords: number;
  removedWords: number;
  /** Number of distinct added/removed runs — a rough proxy for "how many places changed". */
  changedRuns: number;
  identical: boolean;
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export function summarizeDiff(segments: DiffSegment[]): DiffSummary {
  let addedWords = 0;
  let removedWords = 0;
  let changedRuns = 0;
  for (const s of segments) {
    if (s.type === 'same') continue;
    changedRuns += 1;
    if (s.type === 'added') addedWords += wordCount(s.text);
    else removedWords += wordCount(s.text);
  }
  return { addedWords, removedWords, changedRuns, identical: changedRuns === 0 };
}
