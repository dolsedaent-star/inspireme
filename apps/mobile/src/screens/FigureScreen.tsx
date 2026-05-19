import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Figure } from '@inspireme/shared';
import { colors, spacing, type } from '../theme';
import { loadFigureById } from '../services/figures';
import type { ScreenProps } from '../navigation/types';

/**
 * Placeholder — full Hero / Timeline / EventDetail / LifeCurve / Comparison
 * composition lands in the next milestone. For now we confirm data lookup
 * works against either Supabase or the local mock.
 */
export default function FigureScreen({ route }: ScreenProps<'Figure'>) {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!figure) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>인물을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>{figure.era.toUpperCase()}</Text>
        <Text style={styles.name}>{figure.name_ko}</Text>
        <Text style={styles.nameEn}>{figure.name_en}</Text>
        <Text style={styles.quote}>“{figure.data.quote_ko}”</Text>
        <Text style={styles.note}>
          (Hero · Timeline · Event Detail · Life Curve · Insights — 다음 단계에서 채워집니다)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { ...type.section, color: colors.gold },
  name: { ...type.heroKo, color: colors.text },
  nameEn: { ...type.caption, color: colors.textSecondary },
  quote: { ...type.quoteKo, color: colors.gold, marginTop: spacing.lg },
  note: { ...type.caption, color: colors.textTertiary, marginTop: spacing.xl },
  title: { ...type.titleKo, color: colors.text, padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
