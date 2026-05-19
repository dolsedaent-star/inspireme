import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { colors } from './src/theme';
import { useAppFonts } from './src/theme/fonts';
import { UserProfileProvider } from './src/state/userProfile';
import { RootNavigator } from './src/navigation/RootNavigator';

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
        <StatusBar style="light" />
        <RootNavigator />
      </UserProfileProvider>
    </SafeAreaProvider>
  );
}
