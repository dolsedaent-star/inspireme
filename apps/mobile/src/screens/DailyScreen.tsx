import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { personalize } from '@inspireme/shared';
import type { Figure, UserProfile } from '@inspireme/shared';
import { colors, radii, spacing, type } from '../theme';
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
              profile={profile}
              onPress={() => (i > 0 ? null : open(figure.id))}
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

function FigureCard({
  figure,
  locked,
  profile,
  onPress,
  onUnlock,
}: {
  figure: Figure;
  locked: boolean;
  profile: UserProfile | null;
  onPress: () => void;
  onUnlock: () => void;
}) {
  const teaser = useMemo(() => {
    if (!profile) return figure.data.summary_ko;
    return personalize(figure, profile).comparison_ko;
  }, [figure, profile]);

  return (
    <Pressable
      onPress={locked ? onUnlock : onPress}
      style={({ pressed }) => [
        styles.card,
        !locked && styles.cardFeatured,
        pressed && !locked && { opacity: 0.85 },
      ]}
    >
      <View style={styles.cardBg}>
        <Text style={styles.cardEyebrow}>{figure.era.toUpperCase()} · {figure.country}</Text>
        <Text style={styles.cardName}>{figure.name_ko}</Text>
        <Text style={styles.cardNameEn}>{figure.name_en}</Text>

        <View style={styles.divider} />

        <Text style={styles.cardQuote} numberOfLines={3}>
          “{figure.data.quote_ko}”
        </Text>

        <Text style={styles.cardTeaser} numberOfLines={2}>
          {teaser}
        </Text>

        {locked ? (
          <View style={styles.lockRow}>
            <Text style={styles.lockText}>광고 시청 후 열기</Text>
            <Text style={styles.lockArrow}>→</Text>
          </View>
        ) : (
          <View style={styles.openRow}>
            <Text style={styles.openText}>이야기 열기</Text>
            <Text style={styles.openArrow}>→</Text>
          </View>
        )}
      </View>
      {locked && <View style={styles.lockOverlay} pointerEvents="none" />}
    </Pressable>
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
  card: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cardFeatured: { borderColor: colors.gold, backgroundColor: colors.bgElevated },
  cardBg: { padding: spacing.lg },
  cardEyebrow: { ...type.label, color: colors.textTertiary, marginBottom: spacing.sm },
  cardName: { ...type.titleKo, color: colors.text },
  cardNameEn: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardQuote: { ...type.quoteKo, color: colors.gold, marginBottom: spacing.md },
  cardTeaser: { ...type.bodyKo, color: colors.textSecondary, marginBottom: spacing.lg },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  openText: { color: colors.gold, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  openArrow: { color: colors.gold, fontSize: 16 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lockText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  lockArrow: { color: colors.textSecondary, fontSize: 16 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 11, 18, 0.45)',
  },
  footerNote: { marginTop: spacing.md, alignItems: 'center' },
  footerText: { color: colors.textTertiary, fontSize: 12 },
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
});
