import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getSupabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'bgm';

/**
 * Stream BGM tracks from Supabase Storage so we can add/replace tracks
 * without rebuilding the app — just `npm run upload-bgm`.
 *
 * - lists all .mp3 in the `bgm` bucket
 * - shuffles, plays one randomly, rotates on track end
 * - falls back to the bundled bgm1.mp3 if listing fails (offline / no env)
 * - exposes muted state + toggle
 */
type Source = string | number;

export function useBgm() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<Source[]>([]);
  const cursorRef = useRef(0);
  const cancelledRef = useRef(false);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    mutedRef.current = muted;
    soundRef.current?.setVolumeAsync(muted ? 0 : 0.35).catch(() => {});
  }, [muted]);

  useEffect(() => {
    cancelledRef.current = false;

    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
      const queue = await buildQueue();
      if (cancelledRef.current) return;
      queueRef.current = queue;
      cursorRef.current = 0;
      if (queue.length === 0) return;
      await playNext();
    })();

    return () => {
      cancelledRef.current = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  async function playNext() {
    if (cancelledRef.current) return;
    const queue = queueRef.current;
    if (queue.length === 0) return;

    const source = queue[cursorRef.current % queue.length];
    cursorRef.current += 1;

    try {
      // Unload previous before loading next.
      await soundRef.current?.unloadAsync().catch(() => {});
      const { sound } = await Audio.Sound.createAsync(
        typeof source === 'string' ? { uri: source } : source,
        {
          // Loop only when there is a single track. With multiple tracks we
          // advance manually via onPlaybackStatusUpdate.
          isLooping: queue.length === 1,
          volume: mutedRef.current ? 0 : 0.35,
          shouldPlay: true,
        },
      );
      if (cancelledRef.current) {
        sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      if (queue.length > 1) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            // schedule async; can't await inside the callback safely
            void playNext();
          }
        });
      }
    } catch (e) {
      console.log('[bgm] failed to play track', e);
    }
  }

  return { enabled: true, muted, toggleMute: () => setMuted((v) => !v) };
}

async function buildQueue(): Promise<Source[]> {
  const fallback: Source[] = [require('../../assets/bgm/bgm1.mp3')];

  if (!isSupabaseConfigured) return fallback;

  try {
    const sb = getSupabase();
    const { data, error } = await sb.storage.from(BUCKET).list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;

    const mp3s = (data ?? []).filter((f) => f.name.toLowerCase().endsWith('.mp3'));
    if (mp3s.length === 0) return fallback;

    const urls: string[] = mp3s.map((f) => {
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(f.name);
      return pub.publicUrl;
    });
    return shuffle(urls);
  } catch (e) {
    console.log('[bgm] could not list bucket, falling back to bundled track', e);
    return fallback;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
