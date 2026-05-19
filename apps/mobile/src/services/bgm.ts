import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

// BGM 파일은 repo 루트 bgm/ 폴더에서 관리합니다.
// 새 곡 추가 시 아래 배열에 require() 한 줄 추가.
const TRACKS: ReturnType<typeof require>[] = [
  require('../../../../bgm/bgm1.mp3'),
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useBgm() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const track = pickRandom(TRACKS);
      const { sound } = await Audio.Sound.createAsync(track, {
        isLooping: true,
        volume: 0.35,
        shouldPlay: true,
      });
      if (cancelled) { sound.unloadAsync(); return; }
      soundRef.current = sound;
    }

    start();
    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(muted ? 0 : 0.35);
  }, [muted]);

  return {
    enabled: true,
    muted,
    toggleMute: () => setMuted(v => !v),
  };
}
