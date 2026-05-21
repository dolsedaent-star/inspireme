import { sb } from './lib/supabase.js';

const { error } = await sb
  .from('figure_candidates')
  .select('slug, image_url, preview_ko')
  .limit(1);

if (error) {
  console.log('NOT applied:', error.message ?? error.code);
} else {
  console.log('0004 applied ✓ — image_url & preview_ko columns exist');
}
