import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';
import { useUserProfile } from '../state/userProfile';
import ProfileScreen from '../screens/ProfileScreen';
import DailyScreen from '../screens/DailyScreen';
import FigureScreen from '../screens/FigureScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    primary: colors.gold,
    border: colors.border,
    notification: colors.accent,
  },
};

export function RootNavigator() {
  const { loading, profile } = useUserProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={profile ? 'Daily' : 'Profile'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Daily" component={DailyScreen} />
        <Stack.Screen
          name="Figure"
          component={FigureScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
