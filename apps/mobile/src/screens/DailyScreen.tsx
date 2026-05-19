import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { Figure } from '../shared';
import { colors, radii, spacing, type } from '../theme';
import { FigureCard } from '../components/FigureCard';
import { loadDailyFigures } from '../services/figures';
import { useUserProfile } from '../state/userProfile';
import type { ScreenProps } from '../navigation/types';

const KO_DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

export default function DailyScreen({ navigation }: ScreenProps<'Daily'>) {
  const { profile } = useUserProfile();
  const today = useMemo(() => KO_DATE.format(new Date()), []);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadDailyFigures();
        if (!cancelled) setFigures(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (figureId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Figure', { figureId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.dateLine}>{today}</Text>
        <Text style={styles.title}>오늘의 영감</Text>
        <Text style={styles.subtitle}>당신의 하루를 비추는 세 사람.</Text>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.gold} />
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>불러오기 실패: {error}</Text>
          </View>
        )}

        {!loading &&
          figures.slice(0, 3).map((figure, i) => (
            <FigureCard
              key={figure.id}
              figure={figure}
              locked={i > 0}
              featured={i === 0}
              profile={profile}
              onPress={() => (i === 0 ? open(figure.id) : null)}
              onUnlock={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                // TODO: AdMob interstitial integration.
              }}
            />
          ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            추가 카드는 짧은 광고 시청 후 열립니다 (개발 중).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  dateLine: { ...type.section, color: colors.gold, marginBottom: spacing.sm },
  title: { ...type.heroKo, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...type.bodyKo, color: colors.textSecondary, marginBottom: spacing.xl },
  loadingBox: { paddingVertical: spacing.xxl, alignItems: 'center' },
  errorBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 90, 90, 0.08)',
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.accent, fontSize: 13 },
  footerNote: { marginTop: spacing.md, alignItems: 'center' },
  footerText: { color: colors.textTertiary, fontSize: 12 },
});
