import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from './src/theme/fonts';
import { UserProfileProvider } from './src/state/userProfile';
import { ViewedFiguresProvider } from './src/state/viewedFigures';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppInner() {
  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
    </>
  );
}

export default function App() {
  useAppFonts(); // 백그라운드 로드 — 완료 기다리지 않고 바로 실행

  return (
    <SafeAreaProvider>
      <UserProfileProvider>
        <ViewedFiguresProvider>
          <AppInner />
        </ViewedFiguresProvider>
      </UserProfileProvider>
    </SafeAreaProvider>
  );
}
