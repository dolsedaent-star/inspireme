import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getSupabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'bgm';
const MAX_VOL = 0.35;
const FADE_STEPS = 7;
const FADE_MS = 50;

export type BgmMood = 'default' | 'young' | 'hardship' | 'death';

type AVSource = { uri: string } | number;
type Pools = Record<BgmMood, AVSource[]>;

const MOOD_PREFIXES: Record<BgmMood, string[]> = {
  default:  ['bgm'],
  young:    ['young'],
  hardship: ['pain', 'tension'],
  death:    ['die'],
};

export function useBgm() {
  const soundRef    = useRef<Audio.Sound | null>(null);
  const mutedRef    = useRef(false);
  const genRef      = useRef(0);
  const currentMood = useRef<BgmMood>('young');
  const poolsRef    = useRef<Pools>({ default: [], young: [], hardship: [], death: [] });
  const readyRef    = useRef(false);
  const pendingMood = useRef<BgmMood | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    mutedRef.current = muted;
    soundRef.current?.setVolumeAsync(muted ? 0 : MAX_VOL).catch(() => {});
  }, [muted]);

  useEffect(() => {
    let alive = true;

    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
      const pools = await buildPools();
      if (!alive) return;
      poolsRef.current = pools;
      readyRef.current = true;
      const start = pendingMood.current ?? 'young';
      pendingMood.current = null;
      await playMood(start, ++genRef.current, pools);
    })();

    return () => {
      alive = false;
      genRef.current++;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const setMood = useCallback((mood: BgmMood) => {
    if (mood === currentMood.current) return;
    currentMood.current = mood;
    if (!readyRef.current) { pendingMood.current = mood; return; }
    void playMood(mood, ++genRef.current, poolsRef.current);
  }, []);

  async function playMood(mood: BgmMood, gen: number, pools: Pools) {
    const bucket = pools[mood];
    if (bucket.length === 0) return;

    // Fade out current track before switching
    const prev = soundRef.current;
    if (prev) {
      for (let i = FADE_STEPS; i >= 0; i--) {
        if (genRef.current !== gen) return;
        await prev.setVolumeAsync((MAX_VOL * i) / FADE_STEPS).catch(() => {});
        await delay(FADE_MS);
      }
      if (genRef.current !== gen) return;
      await prev.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (genRef.current !== gen) return;

    const src = bucket[Math.floor(Math.random() * bucket.length)];
    try {
      const { sound } = await Audio.Sound.createAsync(
        src as Parameters<typeof Audio.Sound.createAsync>[0],
        { isLooping: true, volume: mutedRef.current ? 0 : MAX_VOL, shouldPlay: true },
      );
      if (genRef.current !== gen) { sound.unloadAsync().catch(() => {}); return; }
      soundRef.current = sound;
    } catch (e) {
      console.warn('[bgm] failed to load track', e);
    }
  }

  return { enabled: true, muted, toggleMute: () => setMuted((v) => !v), setMood };
}

async function buildPools(): Promise<Pools> {
  const pools: Pools = { default: [], young: [], hardship: [], death: [] };
  const bundled = require('../../assets/bgm/bgm1.mp3') as number;

  if (!isSupabaseConfigured) {
    pools.default = pools.young = pools.hardship = pools.death = [bundled];
    return pools;
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb.storage.from(BUCKET).list('', {
      limit: 200,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;

    for (const file of (data ?? []).filter((f) => f.name.toLowerCase().endsWith('.mp3'))) {
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(file.name);
      const base = file.name.toLowerCase().replace(/\.mp3$/, '');
      let assigned = false;
      for (const [mood, prefixes] of Object.entries(MOOD_PREFIXES) as [BgmMood, string[]][]) {
        if (prefixes.some((p) => base.startsWith(p))) {
          pools[mood].push({ uri: pub.publicUrl });
          assigned = true;
          break;
        }
      }
      if (!assigned) pools.default.push({ uri: pub.publicUrl });
    }
  } catch (e) {
    console.warn('[bgm] bucket fetch failed, using bundled track', e);
  }

  // Fallback: any empty mood bucket → use bundled track
  for (const mood of Object.keys(pools) as BgmMood[]) {
    if (pools[mood].length === 0) pools[mood] = [bundled];
  }

  return pools;
}

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
