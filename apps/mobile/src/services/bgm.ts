import { useState } from 'react';

// TODO: Place bgm.mp3 at apps/mobile/assets/bgm.mp3, then switch BGM_ENABLED to true
// and uncomment the expo-audio imports + implementation below.
const BGM_ENABLED = false;

export function useBgm() {
  const [muted, setMuted] = useState(false);

  // Full implementation (activate when bgm.mp3 is ready):
  // const player = useAudioPlayer(require('../../assets/bgm.mp3'));
  // useEffect(() => { player.loop = true; player.volume = 0.35; player.play(); }, []);
  // useEffect(() => { player.volume = muted ? 0 : 0.35; }, [muted]);

  return {
    enabled: BGM_ENABLED,
    muted,
    toggleMute: () => setMuted(v => !v),
  };
}
