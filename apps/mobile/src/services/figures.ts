import type { Figure, FigureCategory, FigureData, FigureSources } from '../shared';
import { mockFigures } from '../data/mockFigures';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { generateAndCacheFigure, pickNextCandidate } from './dynamic';

type FigureRow = {
  id: string;
  slug: string;
  name: string;
  korean_name: string | null;
  title: string | null;
  era: string | null;
  country: string | null;
  country_code: string | null;
  birth_year: number | null;
  death_year: number | null;
  fields: string[] | null;
  keywords: string[] | null;
  data: FigureData;
  image_url: string | null;
  image_credit: string | null;
  sources: FigureSources | null;
};

function rowToFigure(row: FigureRow): Figure {
  // Synthesize Wikipedia URLs from name so we always have a citation, even
  // for figures whose generator run pre-dated the sources column.
  const wikiKo = `https://ko.wikipedia.org/wiki/${encodeURIComponent(row.korean_name ?? row.name)}`;
  const wikiEn = `https://en.wikipedia.org/wiki/${encodeURIComponent(row.name.replace(/ /g, '_'))}`;
  return {
    id: row.id,
    name_ko: row.korean_name ?? row.name,
    name_en: row.name,
    era: row.era ?? '',
    birth_year: row.birth_year ?? 0,
    death_year: row.death_year,
    country: row.country ?? '',
    categories: (row.fields ?? []) as FigureCategory[],
    cover_image_url: row.image_url,
    image_credit: row.image_credit,
    sources: {
      wikipedia_ko: row.sources?.wikipedia_ko ?? wikiKo,
      wikipedia_en: row.sources?.wikipedia_en ?? wikiEn,
      image_credit: row.sources?.image_credit ?? row.image_credit ?? undefined,
      generated_by: row.sources?.generated_by,
      generated_at: row.sources?.generated_at,
    },
    data: row.data,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Three picks for the Daily screen.
 *
 * - First entry (preferDynamic=false): fill from cached figures pool (fast).
 * - Re-roll (preferDynamic=true): prefer un-generated candidates and create
 *   them live (Gemini + Wiki + Storage). Falls back to cached pool if
 *   generation fails or candidates run out.
 * - `exclude` skips figures already shown / viewed.
 */
// Korean app — Korean figures appear more often in the cached pool.
const PREFERRED_COUNTRIES = ['korea'];

function fieldOverlap(rowFields: string[] | null | undefined, userFields: string[]): number {
  if (!rowFields?.length || !userFields.length) return 0;
  const set = new Set(userFields);
  return rowFields.filter((f) => set.has(f)).length;
}

/**
 * Politics / military figures are often heroes in one country and villains
 * in another (e.g. 안중근). Skip them unless the user explicitly chose those
 * fields. Figures with other categories (e.g. politics+literature like 처칠)
 * still surface — only "purely political/military" entries get filtered out.
 */
const SENSITIVE_CATS = new Set(['politics', 'military']);

function isSensitiveFigure(
  figureFields: string[] | null | undefined,
  userFields: string[],
): boolean {
  if (!figureFields?.length) return false;
  const userOptedIn = userFields.some((f) => SENSITIVE_CATS.has(f));
  if (userOptedIn) return false; // user picked politics or military → fine
  return figureFields.every((f) => SENSITIVE_CATS.has(f));
}

/** Filter rows down to ones that match at least one user field. */
function filterByFields<T extends { fields: string[] | null }>(rows: T[], userFields: string[]): T[] {
  if (!userFields.length) return rows;
  return rows.filter((r) => fieldOverlap(r.fields, userFields) > 0);
}

/**
 * Weighted shuffle: Korean figures get 2× weight vs. others.
 * Uses the random-key method — statistically correct weighted sampling.
 */
function weightedShuffle(rows: FigureRow[], userFields: string[]): FigureRow[] {
  return rows
    .map((r) => {
      const countryW = PREFERRED_COUNTRIES.includes(r.country_code ?? '') ? 2 : 1;
      const fieldW = 1 + fieldOverlap(r.fields, userFields);
      return { r, key: Math.random() * countryW * fieldW };
    })
    .sort((a, b) => b.key - a.key)
    .map(({ r }) => r);
}

export async function loadDailyFigures(opts: {
  exclude?: string[];
  count?: number;
  preferDynamic?: boolean;
  userFields?: string[];
  /** Each figure as it becomes available (kept for callers that want it). */
  onIncremental?: (figure: Figure) => void;
  /** Fires after each candidate finishes (success or fail), so the UI can
   *  drive a real progress indicator instead of a looping animation. */
  onProgress?: (completed: number, total: number) => void;
} = {}): Promise<Figure[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);
  const preferDynamic = opts.preferDynamic ?? false;
  const userFields = opts.userFields ?? [];
  const onIncremental = opts.onIncremental;
  const onProgress = opts.onProgress;

  if (!isSupabaseConfigured) {
    const list = shuffle(mockFigures.filter((f) => !exclude.has(f.id))).slice(0, count);
    list.forEach((f) => onIncremental?.(f));
    return list;
  }

  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from('figures')
    .select('*')
    .or('death_year.not.is.null,birth_year.lt.1940');
  if (error) throw error;
  const cachedPool = (rows ?? [])
    .filter((r) => !exclude.has(r.id))
    .filter((r) => !isSensitiveFigure(r.fields, userFields));

  const picked: Figure[] = [];

  if (preferDynamic) {
    // Pick all candidates first so we don't double-pick the same slug.
    const usedSlugs = new Set<string>();
    const candidates: NonNullable<Awaited<ReturnType<typeof pickNextCandidate>>>[] = [];
    for (let i = 0; i < count; i++) {
      const c = await pickNextCandidate(Array.from(exclude), userFields, Array.from(usedSlugs));
      if (!c) break;
      candidates.push(c);
      usedSlugs.add(c.slug);
    }
    let completed = 0;
    onProgress?.(0, count);
    await Promise.all(
      candidates.map(async (c) => {
        const f = await generateAndCacheFigure(c);
        if (f) {
          picked.push(f);
          onIncremental?.(f);
        }
        completed += 1;
        onProgress?.(completed, count);
      }),
    );
  }

  // Fill remaining slots from cached pool.
  // Soft rank by field affinity instead of hard filter — if a re-roll
  // partially failed (Gemini timeout, sensitive candidate skipped, etc.)
  // we still want to surface 3 cards rather than leaving the user with 1.
  if (picked.length < count) {
    const used = new Set([...exclude, ...picked.map((f) => f.id)]);
    const remaining = cachedPool.filter((r) => !used.has(r.id));
    const pool = weightedShuffle(remaining, userFields);
    for (const r of pool.slice(0, count - picked.length)) {
      const f = rowToFigure(r);
      picked.push(f);
      onIncremental?.(f);
    }
  }

  // Absolute last resort — if we still don't have 3 cards because the
  // user has burned through the un-viewed pool, allow re-showing already-
  // viewed figures so the screen is never half-empty. (Three cards beats
  // perfect "no repeats" UX.)
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((f) => f.id));
    const allRows = (rows ?? []).filter((r) => !pickedIds.has(r.id));
    const pool = weightedShuffle(allRows, userFields);
    for (const r of pool.slice(0, count - picked.length)) {
      const f = rowToFigure(r);
      picked.push(f);
      onIncremental?.(f);
    }
  }

  // Cached fills count toward progress completion as well so we hit 100%.
  onProgress?.(count, count);

  // Only use mock stubs when Supabase is not configured — mock IDs are slugs,
  // not UUIDs, so they can never be resolved by loadFigureById and would show
  // "인물을 찾을 수 없습니다." on the detail screen.
  if (picked.length === 0 && !isSupabaseConfigured) {
    const fallback = mockFigures.slice(0, count);
    fallback.forEach((f) => onIncremental?.(f));
    return fallback;
  }
  return picked;
}

export async function loadFigureById(id: string): Promise<Figure | null> {
  if (!isSupabaseConfigured) {
    return mockFigures.find((f) => f.id === id) ?? null;
  }
  const sb = getSupabase();
  const { data, error } = await sb.from('figures').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToFigure(data) : null;
}

export async function loadFigureBySlug(slug: string): Promise<Figure | null> {
  if (!isSupabaseConfigured) {
    return mockFigures.find((f) => f.id === slug) ?? null;
  }
  const sb = getSupabase();
  const { data, error } = await sb.from('figures').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? rowToFigure(data) : null;
}

// ─────────────────────────────────────────────────────────────
// Preview cards — what the Daily screen shows. Cheap to render: a
// figure_candidates row plus, if the figure has been generated before, a
// pointer to the cached figures.id. No Gemini cost.
// ─────────────────────────────────────────────────────────────

export interface PreviewCard {
  slug: string;
  name_ko: string;
  name_en: string;
  categories: FigureCategory[];
  era: string | null;
  image_url: string | null;
  preview_ko: string | null;
  /** UUID in `figures` if the full content has already been generated. */
  figureId: string | null;
}

type CandidateRow = {
  slug: string;
  name_en: string;
  name_ko: string | null;
  categories: string[] | null;
  country: string | null;
  deceased: boolean | null;
  image_url: string | null;
  preview_ko: string | null;
};

function candidateToPreview(c: CandidateRow, figureId: string | null, era: string | null): PreviewCard {
  return {
    slug: c.slug,
    name_ko: c.name_ko ?? c.name_en,
    name_en: c.name_en,
    categories: (c.categories ?? []) as FigureCategory[],
    era,
    image_url: c.image_url,
    preview_ko: c.preview_ko,
    figureId,
  };
}

export async function loadDailyPreviews(opts: {
  exclude?: string[]; // viewed slugs
  count?: number;
  userFields?: string[];
} = {}): Promise<PreviewCard[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);
  const userFields = opts.userFields ?? [];

  if (!isSupabaseConfigured) {
    return [];
  }

  const sb = getSupabase();

  // Pull every deceased candidate that has at least a preview image — we'd
  // rather skip showing a placeholder than show a faceless card.
  const { data: candidates, error: cErr } = await sb
    .from('figure_candidates')
    .select('slug, name_en, name_ko, categories, country, deceased, image_url, preview_ko')
    .eq('deceased', true);
  if (cErr) throw cErr;

  let pool = (candidates ?? []) as CandidateRow[];

  // Strict field filter — sports user sees sports figures only.
  if (userFields.length > 0) {
    const userSet = new Set(userFields);
    pool = pool.filter(
      (c) => (c.categories ?? []).some((f) => userSet.has(f)),
    );
  }

  // Drop sensitive (politics/military only) unless user opted in.
  const userOptedSensitive = userFields.some((f) => SENSITIVE_CATS.has(f));
  if (!userOptedSensitive) {
    pool = pool.filter((c) => {
      const cats = c.categories ?? [];
      if (cats.length === 0) return true;
      return !cats.every((f) => SENSITIVE_CATS.has(f));
    });
  }

  // Drop viewed.
  pool = pool.filter((c) => !exclude.has(c.slug));

  // Drop ones with no image — we'd rather show 2 cards than a faceless one.
  pool = pool.filter((c) => c.image_url);

  // Map slug → figures.id (so a tap on an already-generated figure skips Gemini)
  const slugs = pool.map((c) => c.slug);
  const eraBySlug = new Map<string, string | null>();
  const idBySlug = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: figs } = await sb
      .from('figures')
      .select('slug, id, era')
      .in('slug', slugs);
    for (const f of figs ?? []) {
      idBySlug.set(f.slug, f.id);
      eraBySlug.set(f.slug, f.era);
    }
  }

  // Weighted shuffle: prefer Korean candidates + ones that match user fields
  // more deeply. Keep results varied between re-rolls.
  const ranked = pool
    .map((c) => {
      const countryW = c.country === 'korea' ? 2 : 1;
      const fieldW = 1 + (c.categories ?? []).filter((f) => userFields.includes(f)).length;
      return { c, key: Math.random() * countryW * fieldW };
    })
    .sort((a, b) => b.key - a.key);

  const picked: PreviewCard[] = [];
  for (const { c } of ranked) {
    if (picked.length >= count) break;
    picked.push(candidateToPreview(c, idBySlug.get(c.slug) ?? null, eraBySlug.get(c.slug) ?? null));
  }

  // Absolute fallback: if strict field filter wiped the pool, drop the field
  // requirement so we still show something (3 cards > 0 cards).
  if (picked.length < count) {
    const have = new Set(picked.map((p) => p.slug));
    const rest = (candidates ?? [])
      .filter((c) => c.deceased)
      .filter((c) => !exclude.has(c.slug) && !have.has(c.slug) && c.image_url) as CandidateRow[];
    for (const c of shuffle(rest)) {
      if (picked.length >= count) break;
      picked.push(candidateToPreview(c, idBySlug.get(c.slug) ?? null, eraBySlug.get(c.slug) ?? null));
    }
  }

  return picked;
}
