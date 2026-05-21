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
  /** Called as each figure becomes available, so the UI can paint progressively. */
  onIncremental?: (figure: Figure) => void;
} = {}): Promise<Figure[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);
  const preferDynamic = opts.preferDynamic ?? false;
  const userFields = opts.userFields ?? [];
  const onIncremental = opts.onIncremental;

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
    // Kick all generations off in parallel, but emit each one as soon as it
    // settles — first finished card paints in ~8-12s instead of waiting for
    // the slowest one.
    await Promise.all(
      candidates.map(async (c) => {
        const f = await generateAndCacheFigure(c);
        if (f) {
          picked.push(f);
          onIncremental?.(f);
        }
      }),
    );
  }

  // Fill remaining slots from cached pool.
  // Prefer field-matched figures; if none match, fall back to the full pool.
  // weightedShuffle gives Korean figures 2× probability over non-Korean.
  if (picked.length < count) {
    const used = new Set([...exclude, ...picked.map((f) => f.id)]);
    const remaining = cachedPool.filter((r) => !used.has(r.id));
    const fieldFiltered = filterByFields(remaining, userFields);
    const pool = weightedShuffle(fieldFiltered.length > 0 ? fieldFiltered : remaining, userFields);
    for (const r of pool.slice(0, count - picked.length)) {
      const f = rowToFigure(r);
      picked.push(f);
      onIncremental?.(f);
    }
  }

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
