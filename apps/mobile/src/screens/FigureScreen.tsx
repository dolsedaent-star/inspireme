import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { personalize } from '../shared';
import type { Figure } from '../shared';
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
import { SourcesBlock } from '../components/SourcesBlock';
import { loadFigureById } from '../services/figures';
import { useUserProfile } from '../state/userProfile';
import type { ScreenProps } from '../navigation/types';

export default function FigureScreen({ route, navigation }: ScreenProps<'Figure'>) {
  const { profile } = useUserProfile();
  const [figure, setFigure] = useState<Figure | null>(null);
  const [loading, setLoading] = useState(true);

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
    };
  }, [route.params.figureId]);

  const insight = useMemo(
    () => (figure && profile ? personalize(figure, profile) : null),
    [figure, profile],
  );

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Hero figure={figure} onBack={() => navigation.goBack()} />

        <View style={styles.body}>
          {insight && (
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
          )}

          <Section title="요약">
            <Text style={styles.body16}>{data.summary_ko}</Text>
          </Section>

          <Section title="핵심 키워드">
            <KeywordChips keywords={data.keywords} />
          </Section>

          <Section title="추락과 도약">
            <Comparison failure={data.failure_event} success={data.success_event} />
          </Section>

          <Section title="인생 곡선">
            <LifeCurveChart curve={data.life_curve} profile={profile} />
            <Text style={[styles.body14, { marginTop: spacing.md }]}>{data.comparison_ko}</Text>
          </Section>

          <Section title="일대기">
            <TimelineList events={data.timeline} profile={profile} />
          </Section>

          <Section title="통찰 셋">
            <InsightCards insights={data.insights_ko} />
          </Section>

          <Section title="말년과 죽음">
            <Epilogue figure={figure} />
          </Section>

          <Section title="유산">
            <Text style={styles.body16}>{data.legacy_ko}</Text>
          </Section>

          <Section title="오늘">
            <TodayQuestion question={data.today_question_ko} />
          </Section>

          <Section title="출처 / 검증">
            <SourcesBlock sources={figure.sources} />
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: spacing.xxxl },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.md },
  body14: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  body16: { ...type.bodyKo, color: colors.text, fontSize: 16, lineHeight: 26 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { ...type.titleKo, color: colors.textSecondary },

  youPanel: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: 'rgba(217, 179, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.35)',
    gap: spacing.sm,
  },
  youEyebrow: { ...type.label, color: colors.gold },
  youText: { ...type.quoteKo, color: colors.text, fontSize: 17, lineHeight: 26 },
  youSub: { ...type.bodyKo, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
