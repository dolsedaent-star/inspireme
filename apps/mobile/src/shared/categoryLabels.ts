import type { FigureCategory } from './types';

export const CATEGORY_LABEL_KO: Record<FigureCategory, string> = {
  science: '과학',
  art: '예술',
  business: '사업',
  sports: '스포츠',
  literature: '문학',
  philosophy: '철학',
  politics: '정치',
  music: '음악',
  film: '영화',
  tech: '기술',
  social: '사회운동',
  military: '군사',
  exploration: '탐험',
};

export function labelFor(c: FigureCategory): string {
  return CATEGORY_LABEL_KO[c] ?? c;
}

/**
 * Pick the first figure category that the user also picked at onboarding,
 * so we can highlight that exact tag. Falls back to the figure's first
 * category if there's no overlap.
 */
export function matchedCategory(
  figureCats: FigureCategory[],
  userFields: FigureCategory[] | undefined,
): { category: FigureCategory; matched: boolean } | null {
  if (figureCats.length === 0) return null;
  const userSet = new Set(userFields ?? []);
  for (const c of figureCats) {
    if (userSet.has(c)) return { category: c, matched: true };
  }
  return { category: figureCats[0], matched: false };
}
