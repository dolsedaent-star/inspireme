import { sb } from './lib/supabase.js';

const { count: total } = await sb
  .from('figure_candidates')
  .select('*', { count: 'exact', head: true });
const { count: generated } = await sb
  .from('figures')
  .select('*', { count: 'exact', head: true });

console.log(`Candidates: ${total}`);
console.log(`Figures generated: ${generated} / ${total}`);

const { data: figs } = await sb.from('figures').select('slug, source');
const prebuilt = figs?.filter((f) => f.source === 'prebuilt').length ?? 0;
const runtime = figs?.filter((f) => f.source === 'runtime').length ?? 0;
console.log(`  prebuilt: ${prebuilt}`);
console.log(`  runtime: ${runtime}`);
