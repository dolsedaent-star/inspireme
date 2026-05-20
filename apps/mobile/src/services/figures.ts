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

/**
 * Rank a row pool so user-fields overlap surfaces first, then shuffles within
 * each affinity bucket so repeats are rare.
 */
function rankByAffinity<T extends { fields: string[] | null }>(rows: T[], userFields: string[]): T[] {
  if (!userFields.length) return shuffle(rows);
  const buckets = new Map<number, T[]>();
  for (const r of rows) {
    const k = fieldOverlap(r.fields, userFields);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(r);
  }
  const ordered: T[] = [];
  for (const k of [...buckets.keys()].sort((a, b) => b - a)) {
    ordered.push(...shuffle(buckets.get(k)!));
  }
  return ordered;
}

export async function loadDailyFigures(opts: {
  exclude?: string[];
  count?: number;
  preferDynamic?: boolean;
  userFields?: string[];
} = {}): Promise<Figure[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);
  const preferDynamic = opts.preferDynamic ?? false;
  const userFields = opts.userFields ?? [];

  if (!isSupabaseConfigured) {
    return shuffle(mockFigures.filter((f) => !exclude.has(f.id))).slice(0, count);
  }

  const sb = getSupabase();
  const { data: rows, error } = await sb.from('figures').select('*');
  if (error) throw error;
  const cachedPool = (rows ?? []).filter((r) => !exclude.has(r.id));

  let picked: Figure[] = [];

  if (preferDynamic) {
    // Try to generate fresh figures in parallel — user-field affinity first.
    const used = new Set(exclude);
    const candidates: Awaited<ReturnType<typeof pickNextCandidate>>[] = [];
    for (let i = 0; i < count; i++) {
      const c = await pickNextCandidate(Array.from(used), userFields);
      if (!c) break;
      candidates.push(c);
      used.add(c.slug);
    }
    const generated = (await Promise.all(
      candidates.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => generateAndCacheFigure(c)),
    )).filter((f): f is Figure => f !== null);
    picked.push(...generated);
  }

  // Fill remaining slots from cached pool, weighted by field affinity.
  if (picked.length < count) {
    const used = new Set([...exclude, ...picked.map((f) => f.id)]);
    const remaining = cachedPool.filter((r) => !used.has(r.id));
    const ranked = rankByAffinity(remaining, userFields);
    picked.push(...ranked.slice(0, count - picked.length).map(rowToFigure));
  }

  if (picked.length === 0) return mockFigures.slice(0, count);
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
