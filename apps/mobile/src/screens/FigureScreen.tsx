import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryItem } from '../shared';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { personalize } from '../shared';
import type { Figure } from '../shared';
import { useBgm, type BgmMood } from '../services/bgm';
import { MuteButton } from '../components/MuteButton';
import { colors, spacing, type } from '../theme';
import { Hero } from '../components/Hero';
import { SectionLabel } from '../components/SectionLabel';
import { KeywordChips } from '../components/KeywordChips';
import { TimelineList } from '../components/TimelineList';
import { LifeCurveChart } from '../components/LifeCurveChart';
import { InsightCards } from '../components/InsightCards';
import { TodayQuestion } from '../components/TodayQuestion';
import { Comparison } from '../components/Comparison';
import { Epilogue } from '../components/Epilogue';
import { Gallery } from '../components/Gallery';
import { SourcesBlock } from '../components/SourcesBlock';
import { loadFigureById } from '../services/figures';
import { useUserProfile } from '../state/userProfile';
import type { ScreenProps } from '../navigation/types';

// Which mood each section triggers when scrolled into view
const SECTION_MOODS: Record<string, BgmMood> = {
  '요약':       'young',
  '핵심 키워드': 'young',
  '추락과 도약': 'hardship',
  '인생 곡선':  'default',
  '일대기':     'default',
  '주요 순간':  'default',
  '통찰 셋':    'default',
  '말년과 죽음': 'death',
  '유산':       'default',
  '오늘':       'default',
  '출처 / 검증': 'default',
};

export default function FigureScreen({ route, navigation }: ScreenProps<'Figure'>) {
  const { profile } = useUserProfile();
  const [figure, setFigure] = useState<Figure | null>(null);
  const [loading, setLoading] = useState(true);
  const { muted, toggleMute, setMood } = useBgm();

  // Scroll-based mood tracking
  const bodyYRef     = useRef(0);
  const sectionYsRef = useRef<{ title: string; y: number; mood: BgmMood }[]>([]);
  const activeMood   = useRef<BgmMood>('young');
  const moodTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  function recordSectionY(title: string, e: LayoutChangeEvent) {
    const mood = SECTION_MOODS[title] ?? 'default';
    const y = e.nativeEvent.layout.y;
    sectionYsRef.current = [
      ...sectionYsRef.current.filter((s) => s.title !== title),
      { title, y, mood },
    ].sort((a, b) => a.y - b.y);
  }

  function moodForScrollY(scrollY: number): BgmMood {
    const bodyY = bodyYRef.current;
    let next: BgmMood = 'young';
    if (scrollY >= bodyY * 0.5) {
      for (const s of sectionYsRef.current) {
        if (scrollY + 120 >= bodyY + s.y) next = s.mood;
      }
    }
    return next;
  }

  // 스크롤 중에는 무드 전환하지 않고, 멈췄을 때만 적용
  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = moodForScrollY(e.nativeEvent.contentOffset.y);
    if (next !== activeMood.current) {
      activeMood.current = next;
      setMood(next);
    }
  }

  // 천천히 손가락으로 스크롤할 때 (momentum 없이 멈추는 경우)
  function handleScrollEndDrag(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (moodTimer.current) clearTimeout(moodTimer.current);
    const scrollY = e.nativeEvent.contentOffset.y;
    moodTimer.current = setTimeout(() => {
      const next = moodForScrollY(scrollY);
      if (next !== activeMood.current) {
        activeMood.current = next;
        setMood(next);
      }
    }, 300);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const f = await loadFigureById(route.params.figureId);
        if (!cancelled) setFigure(f);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (moodTimer.current) clearTimeout(moodTimer.current);
    };
  }, [route.params.figureId]);

  const insight = useMemo(
    () => (figure && profile ? personalize(figure, profile) : null),
    [figure, profile],
  );

  // Fetch Wikipedia images as fallback when the figure has no gallery data.
  const [wikiGallery, setWikiGallery] = useState<GalleryItem[]>([]);
  useEffect(() => {
    if (!figure || (figure.data.gallery?.length ?? 0) > 0) return;
    setWikiGallery([]);
    (async () => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(figure.name_en)}`,
          { headers: { 'User-Agent': 'InspireMe/0.1 (dolsedaent@gmail.com)' } },
        );
        if (!res.ok) return;
        const json = await res.json() as { items?: unknown[] };
        const items: unknown[] = Array.isArray(json.items) ? json.items : [];
        const coverBase = figure.cover_image_url?.split('/').pop()?.toLowerCase() ?? '';
        const picks = items
          .filter((i: any) => {
            if (i.type !== 'image' || !i.srcset?.length) return false;
            const t = String(i.title ?? '').toLowerCase();
            if (t.includes('logo') || t.includes('signature') || t.includes('symbol') || t.includes('map.')) return false;
            if (coverBase && t.includes(coverBase.replace(/^\d+px-/, ''))) return false;
            return true;
          })
          .slice(0, 5)
          .map((i: any) => {
            const last = (i.srcset ?? []).at(-1);
            if (!last?.src) return null;
            const url = String(last.src).startsWith('//') ? `https:${last.src}` : String(last.src);
            const raw = i.caption?.text ?? i.title?.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/[_-]+/g, ' ');
            return { url, caption_ko: raw ? String(raw).trim().slice(0, 90) : undefined } as GalleryItem;
          })
          .filter((x): x is GalleryItem => x !== null);
        setWikiGallery(picks);
      } catch {}
    })();
  }, [figure]);

  const galleryItems: GalleryItem[] = figure?.data.gallery?.length
    ? figure.data.gallery
    : wikiGallery;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!figure) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>인물을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const data = figure.data;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <MuteButton muted={muted} onPress={toggleMute} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
      >
        <Hero figure={figure} onBack={() => navigation.goBack()} userFields={profile?.fields} />

        <View
          style={styles.body}
          onLayout={(e) => { bodyYRef.current = e.nativeEvent.layout.y; }}
        >
          {insight && <YouPanel insight={insight} figure={figure} profile={profile} />}

          <Section title="요약" onLayout={recordSectionY}>
            <Text style={styles.body16}>{data.summary_ko}</Text>
          </Section>

          <Section title="핵심 키워드" onLayout={recordSectionY}>
            <KeywordChips keywords={data.keywords} />
          </Section>

          <Section title="추락과 도약" onLayout={recordSectionY}>
            <Comparison failure={data.failure_event} success={data.success_event} />
          </Section>

          <Section title="인생 곡선" onLayout={recordSectionY}>
            <LifeCurveChart curve={data.life_curve} profile={profile} />
            <Text style={[styles.body14, { marginTop: spacing.md }]}>{data.comparison_ko}</Text>
          </Section>

          <Section title="일대기" onLayout={recordSectionY}>
            <TimelineList events={data.timeline} profile={profile} />
          </Section>

          {galleryItems.length > 0 && (
            <Section title="주요 순간" onLayout={recordSectionY}>
              <Gallery items={galleryItems} />
            </Section>
          )}

          <Section title="통찰 셋" onLayout={recordSectionY}>
            <InsightCards insights={data.insights_ko} />
          </Section>

          <Section title="말년과 죽음" onLayout={recordSectionY}>
            <Epilogue figure={figure} />
          </Section>

          <Section title="유산" onLayout={recordSectionY}>
            <Text style={styles.body16}>{data.legacy_ko}</Text>
          </Section>

          <Section title="오늘" onLayout={recordSectionY}>
            <TodayQuestion question={data.today_question_ko} />
          </Section>

          <Section title="출처 / 검증" onLayout={recordSectionY}>
            <SourcesBlock sources={figure.sources} />
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function YouPanel({
  insight,
  figure,
  profile,
}: {
  insight: ReturnType<typeof personalize>;
  figure: Figure;
  profile: ReturnType<typeof useUserProfile>['profile'];
}) {
  if (!insight) return null;
  return (
    <View style={styles.youPanel}>
      <Text style={styles.youEyebrow}>{profile?.age}세의 당신에게</Text>
      <Text style={styles.youText}>{insight.comparison_ko}</Text>
      {insight.next_turning_point && insight.years_until_next !== null && (
        <Text style={styles.youSub}>
          {figure.name_ko}의 다음 전환점까지 {Math.max(insight.years_until_next, 0)}년 —{' '}
          {insight.next_turning_point.title_ko}
        </Text>
      )}
    </View>
  );
}

function Section({
  title,
  children,
  onLayout,
}: {
  title: string;
  children: React.ReactNode;
  onLayout?: (title: string, e: LayoutChangeEvent) => void;
}) {
  return (
    <View
      style={styles.section}
      onLayout={onLayout ? (e) => onLayout(title, e) : undefined}
    >
      <SectionLabel>{title}</SectionLabel>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.bg },
  scroll:        { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: spacing.xxxl },
  body:          { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl },
  section:       { gap: spacing.md },
  body14:        { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  body16:        { ...type.bodyKo, color: colors.text, fontSize: 16, lineHeight: 26 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText:     { ...type.titleKo, color: colors.textSecondary },

  youPanel: {
    padding:         spacing.lg,
    borderRadius:    16,
    backgroundColor: 'rgba(217, 179, 106, 0.08)',
    borderWidth:     1,
    borderColor:     'rgba(217, 179, 106, 0.35)',
    gap:             spacing.sm,
  },
  youEyebrow: { ...type.label,   color: colors.gold },
  youText:    { ...type.quoteKo, color: colors.text,          fontSize: 17, lineHeight: 26 },
  youSub:     { ...type.bodyKo,  color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
