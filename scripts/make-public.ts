import { sb } from './lib/supabase.js';

const { data, error } = await sb.storage.updateBucket('figure-images', { public: true });
if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
console.log('OK:', data);
