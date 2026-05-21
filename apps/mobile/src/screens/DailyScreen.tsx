import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, type } from '../theme';
import { PreviewCardView } from '../components/PreviewCardView';
import { FaceFillPlaceholder } from '../components/FaceFillPlaceholder';
import { MockAdModal } from '../components/MockAdModal';
import { loadDailyPreviews, type PreviewCard } from '../services/figures';
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
  // viewedIds now holds slugs in the new flow. The hook stores arbitrary strings.
  const { ready, viewedIds, markViewed, resetViewed } = useViewedFigures();
  const today = useMemo(() => KO_DATE.format(new Date()), []);
  const [previews, setPreviews] = useState<PreviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<PreviewCard | null>(null);

  const userFields = profile?.fields ?? [];

  const fetchPreviews = useCallback(
    async (alsoExclude: string[] = []) => {
      setLoading(true);
      setError(null);
      setPreviews([]);
      try {
        const exclude = [...viewedIds, ...alsoExclude];
        let list = await loadDailyPreviews({ exclude, userFields });
        if (list.length === 0 && viewedIds.length > 0) {
          await resetViewed();
          list = await loadDailyPreviews({ exclude: alsoExclude, userFields });
        }
        setPreviews(list);
        setExhausted(list.length === 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [viewedIds, resetViewed, userFields],
  );

  const fetchedOnceRef = useRef(false);
  useEffect(() => {
    if (ready && !fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      fetchPreviews();
    }
  }, [ready, fetchPreviews]);

  // Card tap: show ad → navigate. Gemini call (if needed) happens in FigureScreen.
  const openPreview = (preview: PreviewCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void markViewed(preview.slug);
    setPendingPreview(preview);
    setAdVisible(true);
  };

  const handleAdDone = () => {
    setAdVisible(false);
    if (!pendingPreview) return;
    const p = pendingPreview;
    setPendingPreview(null);
    if (p.figureId) {
      navigation.navigate('Figure', { figureId: p.figureId });
    } else {
      navigation.navigate('Figure', { preview: p });
    }
  };

  // Dev-only re-roll: shuffle previews (no ad, no Gemini cost).
  // Mark the current cards as "seen" so they don't immediately come back.
  const reroll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentSlugs = previews.map((p) => p.slug);
    await Promise.all(currentSlugs.map((s) => markViewed(s)));
    fetchPreviews(currentSlugs);
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
            fetchPreviews();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MockAdModal visible={adVisible} onDone={handleAdDone} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLine}>{today}</Text>
            <Text style={styles.title}>오늘의 영감</Text>
            <Text style={styles.subtitle}>당신의 하루를 비추는 세 사람.</Text>
            {viewedIds.length > 0 && (
              <Pressable onPress={onResetAll} hitSlop={8} style={styles.viewedRow}>
                <Text style={styles.viewedText}>지금까지 {viewedIds.length}명 시청</Text>
                <Text style={styles.viewedReset}>· 초기화 ↺</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => navigation.navigate('Collections')}
              hitSlop={12}
              style={styles.themeBtn}
            >
              <Text style={styles.themeGlyph}>☰</Text>
            </Pressable>
            <Pressable onPress={reroll} hitSlop={12} style={styles.rerollBtn} disabled={loading}>
              <Text style={styles.rerollGlyph}>↻</Text>
            </Pressable>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>불러오기 실패: {error}</Text>
          </View>
        )}

        {loading ? (
          <>
            <FaceFillPlaceholder />
            <FaceFillPlaceholder />
            <FaceFillPlaceholder />
          </>
        ) : (
          !exhausted &&
          previews.slice(0, 3).map((p, i) => (
            <PreviewCardView
              key={p.slug}
              preview={p}
              featured={i === 0}
              profile={profile}
              onPress={() => openPreview(p)}
            />
          ))
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

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            카드 탭 시 짧은 광고 후 위인 이야기가 열립니다.
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
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  rerollBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.5)',
    backgroundColor: 'rgba(217, 179, 106, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rerollGlyph: { color: colors.gold, fontSize: 22, lineHeight: 24 },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeGlyph: { color: colors.gold, fontSize: 20, lineHeight: 22 },
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
