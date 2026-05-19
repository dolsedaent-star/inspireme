import { useFonts } from 'expo-font';

/**
 * Load custom font files. Once we add Playfair Display / Noto Serif KR /
 * Pretendard files into apps/mobile/assets/fonts and register them in
 * app.json (`plugins: [["expo-font", { fonts: [...] }]]`), reference them
 * here. For now this returns `[true]` immediately so platform defaults are
 * used and the splash hand-off is not blocked.
 */
export function useAppFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts({});
  // expo-font returns loaded=true when the font map is empty.
  return [loaded, error];
}
