import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, type } from '../theme';
import { loadCollections, type Collection } from '../services/collections';
import { wikiImageSource } from '../services/images';
import type { ScreenProps } from '../navigation/types';

export default function CollectionsScreen({ navigation }: ScreenProps<'Collections'>) {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadCollections();
        setItems(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const open = (c: Collection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CollectionDetail', { slug: c.slug });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.eyebrow}>큐레이션</Text>
          <Text style={styles.title}>테마로 보는 위인</Text>
          <Text style={styles.subtitle}>한 가지 결로 묶은 인생들.</Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.gold} />
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && items.length === 0 && !error && (
          <Text style={styles.emptyText}>아직 등록된 테마가 없습니다.</Text>
        )}

        {items.map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => open(c)}
            style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }] }]}
          >
            {c.cover_image_url ? (
              <Image
                source={wikiImageSource(c.cover_image_url, 800) ?? { uri: c.cover_image_url }}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.coverFallback]} />
            )}
            <View style={[StyleSheet.absoluteFill, styles.scrim1]} pointerEvents="none" />
            <View style={[styles.scrimBand, styles.scrim2]} pointerEvents="none" />
            <View style={[styles.scrimBand, styles.scrim3]} pointerEvents="none" />

            {c.premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>구독</Text>
              </View>
            )}

            <View style={styles.cardBottom}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {c.title_ko}
              </Text>
              {c.subtitle_ko && (
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {c.subtitle_ko}
                </Text>
              )}
              <Text style={styles.cardMeta}>{c.figure_slugs.length}인의 일대기</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_H = 200;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  header: { marginBottom: spacing.md, gap: spacing.xs },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { color: colors.text, fontSize: 22 },
  eyebrow: { ...type.section, color: colors.gold },
  title: { ...type.heroKo, color: colors.text, fontSize: 32 },
  subtitle: { ...type.bodyKo, color: colors.textSecondary, marginBottom: spacing.md },

  loadingBox: { padding: spacing.xxl, alignItems: 'center' },
  errorBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  errorText: { color: colors.accent, fontSize: 13 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },

  card: {
    height: CARD_H,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverFallback: { backgroundColor: colors.bgElevated },
  scrim1: { backgroundColor: 'rgba(9, 11, 18, 0.25)' },
  scrimBand: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim2: { height: '60%', backgroundColor: 'rgba(9, 11, 18, 0.6)' },
  scrim3: { height: '32%', backgroundColor: 'rgba(9, 11, 18, 0.92)' },

  premiumBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
  },
  premiumText: { color: colors.bg, fontWeight: '700', fontSize: 10, letterSpacing: 1 },

  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  cardTitle: { ...type.titleKo, fontSize: 22, color: colors.text },
  cardSubtitle: { ...type.bodyKo, color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  cardMeta: { ...type.label, color: colors.gold, fontSize: 11, marginTop: spacing.sm },
});
