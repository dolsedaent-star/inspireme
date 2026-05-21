import { sb } from './lib/supabase.js';
import type { FigureData } from '../apps/mobile/src/shared/types.js';

const { data: figs } = await sb.from('figures').select('slug, data').limit(200);
let withGallery = 0;
let withoutGallery = 0;
let total = 0;
const samples: string[] = [];
for (const f of figs ?? []) {
  total++;
  const g = (f.data as FigureData).gallery ?? [];
  if (g.length === 0) {
    withoutGallery++;
  } else {
    withGallery++;
    if (samples.length < 3) {
      samples.push(`${f.slug}: ${g.length} items, first caption = "${g[0].caption_ko ?? '(none)'}"`);
    }
  }
}
console.log(`figures: ${total}`);
console.log(`with gallery:    ${withGallery}`);
console.log(`without gallery: ${withoutGallery}`);
for (const s of samples) console.log('  -', s);
