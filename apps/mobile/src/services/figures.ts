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

/**
 * Today's three picks. Falls back to local mock data when env is missing
 * (so the app keeps working on a fresh checkout before keys are filled).
 */
export async function loadDailyFigures(): Promise<Figure[]> {
  if (!isSupabaseConfigured) {
    return mockFigures.slice(0, 3);
  }

  const sb = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: pick } = await sb
    .from('daily_picks')
    .select('figure_ids')
    .eq('date', today)
    .maybeSingle();

  if (pick?.figure_ids?.length) {
    const { data: rows, error } = await sb
      .from('figures')
      .select('*')
      .in('id', pick.figure_ids as string[]);
    if (error) throw error;
    return (rows ?? []).map(rowToFigure);
  }

  // No pick row yet → pull 3 random prebuilt figures so the screen has content.
  const { data: rows, error } = await sb
    .from('figures')
    .select('*')
    .eq('source', 'prebuilt')
    .limit(3);
  if (error) throw error;
  if (!rows?.length) return mockFigures.slice(0, 3); // empty DB → mock so dev can still flow
  return rows.map(rowToFigure);
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
