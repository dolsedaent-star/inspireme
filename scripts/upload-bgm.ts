import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sb } from './lib/supabase.js';

const BGM_DIR = resolve(import.meta.dirname, '..', '..', 'bgm');
const BUCKET = 'bgm';

async function ensureBucket() {
  const { data } = await sb.storage.listBuckets();
  const exists = data?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`✓ bucket '${BUCKET}' created`);
  }
}

async function uploadBgm() {
  await ensureBucket();

  const files = readdirSync(BGM_DIR).filter(f => f.endsWith('.mp3'));
  if (files.length === 0) {
    console.log('bgm/ 폴더에 MP3 파일이 없습니다.');
    return;
  }

  const { data: existing } = await sb.storage.from(BUCKET).list('', { limit: 1000 });
  const existingNames = new Set(existing?.map(f => f.name) ?? []);

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    if (existingNames.has(file)) {
      console.log(`  skip  ${file} (already uploaded)`);
      skipped++;
      continue;
    }
    const buffer = readFileSync(resolve(BGM_DIR, file));
    const { error } = await sb.storage.from(BUCKET).upload(file, buffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });
    if (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
    } else {
      console.log(`  ✓ ${file}`);
      uploaded++;
    }
  }

  console.log(`\n완료: ${uploaded}개 업로드, ${skipped}개 스킵 (총 ${files.length}개)`);
}

uploadBgm().catch(e => { console.error(e); process.exit(1); });
