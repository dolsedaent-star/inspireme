import { Platform } from 'react-native';

/**
 * Font family tokens. Real font files (Playfair Display / Noto Serif KR /
 * Pretendard) will be added under assets/fonts and registered through the
 * expo-font config plugin. Until then, fall back to platform serifs/sans
 * so the UI still reflects the magazine vibe.
 */
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' })!;
const serifKo = Platform.select({ ios: 'Apple SD Gothic Neo', android: 'serif', default: 'serif' })!;
const sans = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })!;

export const fonts = {
  display: serif,
  displayKo: serifKo,
  body: sans,
  bodyKo: sans,
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, fontWeight: '700' as const, letterSpacing: -0.5 },
  heroKo: { fontFamily: fonts.displayKo, fontSize: 38, lineHeight: 46, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  titleKo: { fontFamily: fonts.displayKo, fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  section: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyKo: { fontFamily: fonts.bodyKo, fontSize: 16, lineHeight: 26, fontWeight: '400' as const },
  quote: { fontFamily: fonts.display, fontSize: 22, lineHeight: 32, fontWeight: '400' as const, fontStyle: 'italic' as const },
  quoteKo: { fontFamily: fonts.displayKo, fontSize: 20, lineHeight: 30, fontWeight: '400' as const },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 1.5 },
} as const;
