import { useState } from 'react';

// BGM 파일(bgm/bgm1.mp3)을 repo 루트에 넣은 뒤 아래 주석을 해제하세요.
// import { useEffect, useRef } from 'react';
// import { Audio } from 'expo-av';
// const TRACKS = [require('../../../../bgm/bgm1.mp3')];

export function useBgm() {
  const [muted, setMuted] = useState(false);
  return { enabled: false, muted, toggleMute: () => setMuted(v => !v) };
}
