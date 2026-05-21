import { getSupabase, isSupabaseConfigured } from './supabase';
import type { PreviewCard } from './figures';
import type { FigureCategory } from '../shared';

export interface Collection {
  slug: string;
  title_ko: string;
  subtitle_ko: string | null;
  description_ko: string | null;
  cover_image_url: string | null;
  figure_slugs: string[];
  premium: boolean;
  display_order: number;
}

export async function loadCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from('figure_collections')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data ?? []) as Collection[];
}

export async function loadCollectionBySlug(slug: string): Promise<Collection | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('figure_collections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data as Collection) ?? null;
}

/**
 * Resolve the list of figure_slugs in a collection into PreviewCards.
 * Pulls from both figure_candidates (preview meta) and figures (cached figureId).
 */
export async function loadCollectionPreviews(slugs: string[]): Promise<PreviewCard[]> {
  if (!isSupabaseConfigured || slugs.length === 0) return [];
  const sb = getSupabase();

  const [{ data: candidates }, { data: figs }] = await Promise.all([
    sb
      .from('figure_candidates')
      .select('slug, name_en, name_ko, categories, country, deceased, image_url, preview_ko')
      .in('slug', slugs),
    sb.from('figures').select('slug, id, era').in('slug', slugs),
  ]);

  const figBySlug = new Map<string, { id: string; era: string | null }>();
  for (const f of figs ?? []) figBySlug.set(f.slug, { id: f.id, era: f.era });

  const candBySlug = new Map(((candidates ?? []) as any[]).map((c) => [c.slug, c]));

  // Preserve the curator's order.
  const previews: PreviewCard[] = [];
  for (const slug of slugs) {
    const c = candBySlug.get(slug);
    if (!c) continue; // candidate missing — skip silently
    const f = figBySlug.get(slug);
    previews.push({
      slug,
      name_ko: c.name_ko ?? c.name_en,
      name_en: c.name_en,
      categories: (c.categories ?? []) as FigureCategory[],
      era: f?.era ?? null,
      image_url: c.image_url,
      preview_ko: c.preview_ko,
      figureId: f?.id ?? null,
    });
  }
  return previews;
}
