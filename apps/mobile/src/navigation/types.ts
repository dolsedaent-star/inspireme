import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PreviewCard } from '../services/figures';

export type FigureRouteParams =
  | { figureId: string; preview?: undefined }
  | { figureId?: undefined; preview: PreviewCard };

export type RootStackParamList = {
  Profile: undefined;
  Daily: undefined;
  Figure: FigureRouteParams;
  Collections: undefined;
  CollectionDetail: { slug: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
