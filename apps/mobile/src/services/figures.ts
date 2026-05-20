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
function fieldOverlap(rowFields: string[] | null | undefined, userFields: string[]): number {
  if (!rowFields?.length || !userFields.length) return 0;
  const set = new Set(userFields);
  return rowFields.filter((f) => set.has(f)).length;
}

/** Filter rows down to ones that match at least one user field. */
function filterByFields<T extends { fields: string[] | null }>(rows: T[], userFields: string[]): T[] {
  if (!userFields.length) return rows;
  return rows.filter((r) => fieldOverlap(r.fields, userFields) > 0);
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
  const { data: rows, error } = await sb.from('figures').select('*');
  if (error) throw error;
  const cachedPool = (rows ?? []).filter((r) => !exclude.has(r.id));

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

  // Fill remaining slots from cached pool — strict field filter so a sports
  // user never sees a scientist if they didn't pick science.
  if (picked.length < count) {
    const used = new Set([...exclude, ...picked.map((f) => f.id)]);
    const remaining = cachedPool.filter((r) => !used.has(r.id));
    const filtered = shuffle(filterByFields(remaining, userFields));
    for (const r of filtered.slice(0, count - picked.length)) {
      const f = rowToFigure(r);
      picked.push(f);
      onIncremental?.(f);
    }
  }

  if (picked.length === 0) {
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
