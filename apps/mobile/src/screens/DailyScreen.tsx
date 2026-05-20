import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { Figure } from '../shared';
import { colors, radii, spacing, type } from '../theme';
import { FigureCard } from '../components/FigureCard';
import { loadDailyFigures } from '../services/figures';
import { useUserProfile } from '../state/userProfile';
import { useViewedFigures } from '../state/viewedFigures';
import type { ScreenProps } from '../navigation/types';

const KO_DATE = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

export default function DailyScreen({ navigation }: ScreenProps<'Daily'>) {
  const { profile } = useUserProfile();
  const { ready, viewedIds, markViewed, resetViewed } = useViewedFigures();
  const today = useMemo(() => KO_DATE.format(new Date()), []);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  // viewed + currently-on-screen are both excluded.
  const [generating, setGenerating] = useState(false);

  const fetchFigures = useCallback(
    async (alsoExclude: string[] = [], opts: { preferDynamic?: boolean; allowReset?: boolean } = {}) => {
      const { preferDynamic = false, allowReset = true } = opts;
      if (preferDynamic) setGenerating(true);
      else setLoading(true);
      setError(null);
      try {
        const exclude = [...viewedIds, ...alsoExclude];
        const list = await loadDailyFigures({ exclude, preferDynamic });
        if (list.length === 0 && allowReset && viewedIds.length > 0) {
          await resetViewed();
          const fresh = await loadDailyFigures({ exclude: alsoExclude });
          setFigures(fresh);
          setExhausted(fresh.length === 0);
          return;
        }
        setFigures(list);
        setExhausted(list.length === 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    },
    [viewedIds, resetViewed],
  );

  // Re-fetch on focus (fresh entry + return from detail).
  useFocusEffect(
    useCallback(() => {
      if (ready) fetchFigures();
    }, [ready, fetchFigures]),
  );

  const open = (figure: Figure) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void markViewed(figure.id);
    navigation.navigate('Figure', { figureId: figure.id });
  };

  const reroll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // ↻ = "completely fresh figures, not from the pool". Mark current cards
    // as seen and ask the loader to prefer dynamic generation.
    await Promise.all(figures.map((f) => markViewed(f.id)));
    fetchFigures(figures.map((f) => f.id), { preferDynamic: true });
  };

  const onResetAll = () => {
    Alert.alert(
      '본 위인 기록을 초기화할까요?',
      `지금까지 ${viewedIds.length}명을 봤어요. 초기화하면 모두 다시 나올 수 있게 됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await resetViewed();
            fetchFigures();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLine}>{today}</Text>
            <Text style={styles.title}>오늘의 영감</Text>
            <Text style={styles.subtitle}>당신의 하루를 비추는 세 사람.</Text>
            {viewedIds.length > 0 && (
              <Pressable onPress={onResetAll} hitSlop={8} style={styles.viewedRow}>
                <Text style={styles.viewedText}>
                  지금까지 {viewedIds.length}명 시청
                </Text>
                <Text style={styles.viewedReset}>· 초기화 ↺</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={reroll} hitSlop={12} style={styles.rerollBtn}>
            <Text style={styles.rerollGlyph}>↻</Text>
          </Pressable>
        </View>

        {(loading || generating) && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.gold} />
            {generating && (
              <Text style={styles.loadingText}>
                새 위인을 모셔오는 중… (15초 정도 걸려요)
              </Text>
            )}
          </View>
        )}

        {error && !loading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>불러오기 실패: {error}</Text>
          </View>
        )}

        {!loading && exhausted && (
          <View style={styles.exhaustedBox}>
            <Text style={styles.exhaustedTitle}>모든 위인을 다 만나셨습니다.</Text>
            <Text style={styles.exhaustedDesc}>
              초기화하면 처음부터 다시 만날 수 있어요. 더 많은 위인은 곧 추가됩니다.
            </Text>
            <Pressable onPress={onResetAll} style={styles.exhaustedBtn}>
              <Text style={styles.exhaustedBtnText}>기록 초기화</Text>
            </Pressable>
          </View>
        )}

        {!loading &&
          !exhausted &&
          figures.slice(0, 3).map((figure, i) => (
            <FigureCard
              key={figure.id}
              figure={figure}
              locked={false}
              featured={i === 0}
              profile={profile}
              onPress={() => open(figure)}
              onUnlock={() => {}}
            />
          ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            테스트 모드 — 카드 탭 또는 ↻로 새 위인을 받습니다. 이미 본 위인은 다시 안 나옵니다.
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
  viewedRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  viewedText: { ...type.caption, color: colors.textTertiary, fontSize: 12 },
  viewedReset: { ...type.caption, color: colors.gold, fontSize: 12, marginLeft: 4 },
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
  loadingBox: { paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md },
  loadingText: { ...type.bodyKo, color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  errorBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 90, 90, 0.08)',
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.accent, fontSize: 13 },
  exhaustedBox: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
    backgroundColor: 'rgba(217, 179, 106, 0.06)',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  exhaustedTitle: { ...type.titleKo, color: colors.text, textAlign: 'center' },
  exhaustedDesc: { ...type.bodyKo, color: colors.textSecondary, textAlign: 'center', fontSize: 14 },
  exhaustedBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    marginTop: spacing.sm,
  },
  exhaustedBtnText: { color: colors.bg, fontWeight: '700', letterSpacing: 0.5 },
  footerNote: { marginTop: spacing.md, alignItems: 'center' },
  footerText: { color: colors.textTertiary, fontSize: 12 },
});
