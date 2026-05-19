import { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getSupabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'bgm';

async function fetchPlaylist(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase().storage.from(BUCKET).list('', { limit: 500 });
  if (error || !data) return [];
  const urls = data
    .filter(f => f.name.endsWith('.mp3'))
    .map(f => getSupabase().storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl);
  return shuffle(urls);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useBgm() {
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const ready = playlist.length > 0;

  const player = useAudioPlayer(ready ? { uri: playlist[trackIndex] } : null);
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    fetchPlaylist().then(setPlaylist);
  }, []);

  useEffect(() => {
    if (!ready) return;
    player.volume = muted ? 0 : 0.35;
    player.play();
  }, [ready, trackIndex]);

  useEffect(() => {
    if (!ready) return;
    player.volume = muted ? 0 : 0.35;
  }, [muted]);

  // Advance to next track when current one ends
  useEffect(() => {
    if (!ready) return;
    const sub = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish) {
        setTrackIndex(i => (i + 1) % playlist.length);
      }
    });
    return () => sub.remove();
  }, [ready, playlist.length]);

  return {
    enabled: ready,
    muted,
    toggleMute: () => setMuted(v => !v),
  };
}
