import { useState } from 'react';

// expo-audio requires a custom dev client — not supported in Expo Go.
// BGM is active in EAS Preview/Production builds only.
// To enable locally: run `eas build --profile preview` and install the APK.

export function useBgm() {
  const [muted, setMuted] = useState(false);
  return {
    enabled: false,
    muted,
    toggleMute: () => setMuted(v => !v),
  };
}
