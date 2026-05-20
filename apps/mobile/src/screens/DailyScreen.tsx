import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const fetchFigures = useCallback(async (exclude: string[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadDailyFigures({ exclude });
      setFigures(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-roll the three picks every time the screen comes into focus
  // (i.e. fresh entry + return from Figure detail). Pure test-mode UX —
  // production will lock to daily_picks.
  useFocusEffect(
    useCallback(() => {
      fetchFigures();
    }, [fetchFigures]),
  );

  const open = (figureId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Figure', { figureId });
  };

  const reroll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchFigures(figures.map((f) => f.id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLine}>{today}</Text>
            <Text style={styles.title}>오늘의 영감</Text>
            <Text style={styles.subtitle}>당신의 하루를 비추는 세 사람.</Text>
          </View>
          <Pressable onPress={reroll} hitSlop={12} style={styles.rerollBtn}>
            <Text style={styles.rerollGlyph}>↻</Text>
          </Pressable>
        </View>

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
              locked={false}
              featured={i === 0}
              profile={profile}
              onPress={() => open(figure.id)}
              onUnlock={() => {}}
            />
          ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            테스트 모드 — 카드 탭 또는 ↻로 새 위인을 무한히 받을 수 있어요.
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xl },
  dateLine: { ...type.section, color: colors.gold, marginBottom: spacing.sm },
  title: { ...type.heroKo, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...type.bodyKo, color: colors.textSecondary },
  rerollBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.5)',
    backgroundColor: 'rgba(217, 179, 106, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  rerollGlyph: { color: colors.gold, fontSize: 22, lineHeight: 24 },
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
