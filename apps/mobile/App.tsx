import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { colors } from './src/theme';
import { useAppFonts } from './src/theme/fonts';
import { UserProfileProvider } from './src/state/userProfile';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useBgm } from './src/services/bgm';
import { MuteButton } from './src/components/MuteButton';

function AppInner() {
  const { enabled, muted, toggleMute } = useBgm();
  return (
    <>
      <StatusBar style="light" />
      <RootNavigator />
      <MuteButton muted={muted} onPress={toggleMute} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <UserProfileProvider>
        <AppInner />
      </UserProfileProvider>
    </SafeAreaProvider>
  );
}
