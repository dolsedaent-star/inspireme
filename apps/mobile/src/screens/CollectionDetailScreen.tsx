import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, type } from '../theme';
import { PreviewCardView } from '../components/PreviewCardView';
import { MockAdModal } from '../components/MockAdModal';
import {
  loadCollectionBySlug,
  loadCollectionPreviews,
  type Collection,
} from '../services/collections';
import type { PreviewCard } from '../services/figures';
import { useUserProfile } from '../state/userProfile';
import type { ScreenProps } from '../navigation/types';

export default function CollectionDetailScreen({
  route,
  navigation,
}: ScreenProps<'CollectionDetail'>) {
  const { profile } = useUserProfile();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [previews, setPreviews] = useState<PreviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adVisible, setAdVisible] = useState(false);
  const [pending, setPending] = useState<PreviewCard | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await loadCollectionBySlug(route.params.slug);
        setCollection(c);
        if (c) {
          const list = await loadCollectionPreviews(c.figure_slugs);
          setPreviews(list);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.slug]);

  const open = (p: PreviewCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPending(p);
    setAdVisible(true);
  };

  const handleAdDone = () => {
    setAdVisible(false);
    if (!pending) return;
    const p = pending;
    setPending(null);
    if (p.figureId) {
      navigation.navigate('Figure', { figureId: p.figureId });
    } else {
      navigation.navigate('Figure', { preview: p });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <MockAdModal visible={adVisible} onDone={handleAdDone} />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.gold} />
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {collection && (
          <>
            <Text style={styles.eyebrow}>{collection.premium ? '구독 컬렉션' : '컬렉션'}</Text>
            <Text style={styles.title}>{collection.title_ko}</Text>
            {collection.subtitle_ko && (
              <Text style={styles.subtitle}>{collection.subtitle_ko}</Text>
            )}
            {collection.description_ko && (
              <Text style={styles.description}>{collection.description_ko}</Text>
            )}
            <Text style={styles.count}>{previews.length}인</Text>

            <View style={styles.cards}>
              {previews.map((p, i) => (
                <PreviewCardView
                  key={p.slug}
                  preview={p}
                  featured={i === 0}
                  profile={profile}
                  onPress={() => open(p)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', marginBottom: spacing.md },
  backArrow: { color: colors.text, fontSize: 22 },
  loadingBox: { padding: spacing.xxl, alignItems: 'center' },
  errorText: { color: colors.accent, fontSize: 13, marginVertical: spacing.lg },
  eyebrow: { ...type.section, color: colors.gold, marginBottom: spacing.sm },
  title: { ...type.heroKo, color: colors.text, fontSize: 36, marginBottom: spacing.sm },
  subtitle: { ...type.quoteKo, color: colors.text, fontSize: 18, marginBottom: spacing.md },
  description: { ...type.bodyKo, color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg },
  count: { ...type.label, color: colors.gold, marginBottom: spacing.lg },
  cards: { gap: spacing.lg },
});
