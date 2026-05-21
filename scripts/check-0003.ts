import { sb } from './lib/supabase.js';

// 0003가 적용됐는지 — country/deceased 컬럼 있는지 select로 확인
const cand = await sb.from('figure_candidates').select('slug, country, deceased').limit(1);
const fig = await sb.from('figures').select('slug, country_code').limit(1);

console.log('figure_candidates query:', cand.error?.message ?? 'OK');
console.log('figures query:           ', fig.error?.message ?? 'OK');

if (!cand.error && !fig.error) {
  console.log('\n→ 0003 마이그레이션 적용됨 ✓');
} else {
  console.log('\n→ 0003 마이그레이션 미적용. Supabase SQL Editor에서 실행 필요.');
}
