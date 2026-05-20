import { createClient } from '@supabase/supabase-js';
import { env } from './lib/env.js';

// Anon client = same as the mobile app
const sb = createClient(env.supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // mini JPEG header bytes
const { error } = await sb.storage.from('figure-images').upload(
  '_test-anon-upload.bin',
  fake,
  { contentType: 'application/octet-stream', upsert: true },
);
console.log(error ? `FAIL: ${error.message}` : 'OK: anon can upload');
