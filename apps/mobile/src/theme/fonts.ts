import { useFonts } from 'expo-font';

export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    'PlayfairDisplay-Regular': require('../../assets/fonts/PlayfairDisplay_400Regular.ttf'),
    'PlayfairDisplay-Italic': require('../../assets/fonts/PlayfairDisplay_400Regular_Italic.ttf'),
    'PlayfairDisplay-Bold': require('../../assets/fonts/PlayfairDisplay_700Bold.ttf'),
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  });
}
