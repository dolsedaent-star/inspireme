import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

const TRACKS = [
  require('../../../../bgm/bgm1.mp3'),
];

export function useBgm() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
      const { sound } = await Audio.Sound.createAsync(track, {
        isLooping: true,
        volume: 0.35,
        shouldPlay: true,
      });
      if (cancelled) { sound.unloadAsync(); return; }
      soundRef.current = sound;
    })();
    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setVolumeAsync(muted ? 0 : 0.35);
  }, [muted]);

  return { enabled: true, muted, toggleMute: () => setMuted(v => !v) };
}
