/**
 * Seed curated collections into figure_collections.
 *
 *   npm run seed-collections
 *
 * Idempotent — re-running just upserts. Figure slugs reference figure_candidates;
 * any slug missing from candidates is reported but doesn't break the seed.
 */

import { sb } from './lib/supabase.js';

type CollectionSeed = {
  slug: string;
  title_ko: string;
  subtitle_ko?: string;
  description_ko?: string;
  figure_slugs: string[];
  premium: boolean;
  display_order: number;
};

const collections: CollectionSeed[] = [
  {
    slug: 'brand-founders',
    title_ko: '브랜드의 시작',
    subtitle_ko: '한 사람의 이름이 어떻게 세계의 브랜드가 됐나',
    description_ko:
      '샤넬, 디오르, 포드, 디즈니, 정주영, 이병철 — 우리가 매일 쓰는 이름 뒤에 한 사람의 인생이 있습니다.',
    figure_slugs: [
      'chanel',
      'christian-dior',
      'yves-saint-laurent',
      'ralph-lauren',
      'gucci',
      'estee-lauder',
      'henry-ford',
      'walt-disney',
      'edison',
      'ray-kroc',
      'colonel-sanders',
      'chung-ju-yung',
      'lee-byung-chul',
      'yu-il-han',
      'shin-kyuk-ho',
      'gu-in-hoe',
      'park-doo-byung',
      'shin-yong-ho',
    ],
    premium: true,
    display_order: 10,
  },
  {
    slug: 'korea-modern',
    title_ko: '한국의 근현대',
    subtitle_ko: '이 땅의 삶을 다시 비추는 사람들',
    description_ko:
      '세종부터 윤동주, 김광석까지 — 한국이라는 이름을 빚어낸 위인들의 일대기.',
    figure_slugs: [
      'sejong-the-great',
      'yi-sun-sin',
      'shin-saimdang',
      'yi-yulgok',
      'toegye',
      'won-buhwa',
      'ahn-jung-geun',
      'kim-koo',
      'park-kyung-ni',
      'yun-dong-ju',
      'kim-soo-young',
      'kim-whanki',
      'park-soo-keun',
      'chun-kyung-ja',
      'kim-kwang-seok',
    ],
    premium: false,
    display_order: 20,
  },
  {
    slug: 'women-pioneers',
    title_ko: '경계를 깬 여자들',
    subtitle_ko: '아무도 가지 않은 길을 처음 걸었던 사람들',
    description_ko:
      '마리 퀴리, 프리다 칼로, 헬렌 켈러부터 신사임당까지 — 시대의 경계를 넘은 여자들의 인생.',
    figure_slugs: [
      'marie-curie',
      'frida-kahlo',
      'helen-keller',
      'florence-nightingale',
      'amelia-earhart',
      'joan-of-arc',
      'elizabeth-i',
      'queen-victoria',
      'marie-antoinette',
      'rosa-parks',
      'mother-teresa',
      'chanel',
      'estee-lauder',
      'audrey-hepburn',
      'princess-diana',
      'mary-shelley',
      'emily-dickinson',
      'emily-bronte',
      'sylvia-plath',
      'shin-saimdang',
      'chun-kyung-ja',
    ],
    premium: true,
    display_order: 30,
  },
  {
    slug: 'nobel-peace',
    title_ko: '평화의 무게',
    subtitle_ko: '시대의 양심이 된 사람들',
    description_ko: '한 시대의 갈등 속에서 다른 길을 가리킨 사람들의 일대기.',
    figure_slugs: [
      'mlk',
      'nelson-mandela',
      'mother-teresa',
      'malala',
      'gandhi',
    ],
    premium: true,
    display_order: 40,
  },
  {
    slug: 'late-bloomers',
    title_ko: '늦게 시작한 사람들',
    subtitle_ko: '시작은 어디서든 늦지 않다',
    description_ko:
      '27세에 처음 붓을 잡은 반 고흐, 65세에 KFC를 시작한 샌더스 — 시계는 자기 자신만의 것입니다.',
    figure_slugs: [
      'van-gogh',
      'colonel-sanders',
      'ray-kroc',
      'nelson-mandela',
      'churchill',
      'walt-disney',
    ],
    premium: false,
    display_order: 50,
  },
  {
    slug: 'artists-muse',
    title_ko: '예술가의 일생',
    subtitle_ko: '한 인생을 다 바쳐 한 가지를 그린 사람들',
    description_ko:
      '레오나르도 다 빈치부터 김환기까지 — 캔버스 한 면에 자신을 다 쏟은 예술가들의 이야기.',
    figure_slugs: [
      'leonardo-da-vinci',
      'michelangelo',
      'van-gogh',
      'monet',
      'picasso',
      'kandinsky',
      'frida-kahlo',
      'warhol',
      'kim-whanki',
      'park-soo-keun',
      'chun-kyung-ja',
    ],
    premium: true,
    display_order: 60,
  },
];

// Sanity check — which slugs are actually in figure_candidates?
const { data: candRows } = await sb.from('figure_candidates').select('slug, image_url');
const candidatesBySlug = new Map((candRows ?? []).map((c) => [c.slug, c]));

console.log(`Seeding ${collections.length} collections…\n`);
for (const col of collections) {
  const missing = col.figure_slugs.filter((s) => !candidatesBySlug.has(s));
  if (missing.length > 0) {
    console.log(`  ⚠ ${col.slug}: ${missing.length} missing slugs → ${missing.join(', ')}`);
  }
  // Cover image = first figure that has an image_url.
  const cover = col.figure_slugs
    .map((s) => candidatesBySlug.get(s)?.image_url)
    .find((u): u is string => !!u);

  const { error } = await sb
    .from('figure_collections')
    .upsert(
      {
        slug: col.slug,
        title_ko: col.title_ko,
        subtitle_ko: col.subtitle_ko ?? null,
        description_ko: col.description_ko ?? null,
        cover_image_url: cover ?? null,
        figure_slugs: col.figure_slugs,
        premium: col.premium,
        display_order: col.display_order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' },
    );
  if (error) {
    console.log(`  ✗ ${col.slug}: ${error.message}`);
  } else {
    console.log(`  ✓ ${col.slug}: ${col.figure_slugs.length} figures (${col.premium ? '구독' : '무료'})`);
  }
}
console.log('\nDone.');
