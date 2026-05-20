import type { Figure, FigureCategory, FigureData, FigureSources } from '../shared';
import { mockFigures } from '../data/mockFigures';
import { getSupabase, isSupabaseConfigured } from './supabase';

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
 * Test-mode behavior: instead of locking to the date's `daily_picks` row,
 * we always return a fresh random sample from the prebuilt pool so a refresh
 * yields different figures. The `daily_picks` table will come back when we
 * wire up the scheduler closer to launch.
 *
 * `exclude` lets the caller skip figures already shown (e.g. swap one card).
 */
export async function loadDailyFigures(opts: { exclude?: string[]; count?: number } = {}): Promise<Figure[]> {
  const count = opts.count ?? 3;
  const exclude = new Set(opts.exclude ?? []);

  if (!isSupabaseConfigured) {
    return shuffle(mockFigures.filter((f) => !exclude.has(f.id))).slice(0, count);
  }

  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from('figures')
    .select('*')
    .eq('source', 'prebuilt');
  if (error) throw error;
  if (!rows?.length) return mockFigures.slice(0, count);

  const pool = rows.filter((r) => !exclude.has(r.id));
  return shuffle(pool).slice(0, count).map(rowToFigure);
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
