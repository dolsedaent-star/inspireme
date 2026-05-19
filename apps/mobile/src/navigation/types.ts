import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Profile: undefined;
  Daily: undefined;
  Figure: { figureId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
