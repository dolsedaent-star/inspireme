import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Figure } from '@inspireme/shared';
import { colors, radii, spacing, type } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.7);

export function Hero({ figure, onBack }: { figure: Figure; onBack: () => void }) {
  return (
    <View style={styles.wrap}>
      {figure.cover_image_url ? (
        <Image
          source={{ uri: figure.cover_image_url }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      )}

      <View style={[StyleSheet.absoluteFill, styles.scrim1]} pointerEvents="none" />
      <View style={[styles.band, styles.scrim2]} pointerEvents="none" />
      <View style={[styles.band, styles.scrim3]} pointerEvents="none" />
      <View style={[styles.band, styles.scrim4]} pointerEvents="none" />

      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={16}>
        <Text style={styles.backArrow}>←</Text>
      </Pressable>

      <View style={styles.topMeta}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {[figure.era, figure.country].filter(Boolean).join(' · ') || '아카이브'}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.eyebrow}>
          {figure.data.keywords.slice(0, 3).join(' · ')}
        </Text>
        <Text style={styles.name}>{figure.name_ko}</Text>
        <Text style={styles.nameEn}>
          {figure.name_en}
          {figure.birth_year ? ` · ${figure.birth_year}${figure.death_year ? `–${figure.death_year}` : '–'}` : ''}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.quote}>“{figure.data.quote_ko}”</Text>
        <Text style={styles.quoteEn}>{figure.data.quote_en}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HERO_H, overflow: 'hidden', backgroundColor: colors.bg },
  fallbackBg: { backgroundColor: colors.bgElevated },
  scrim1: { backgroundColor: 'rgba(9, 11, 18, 0.35)' },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim2: { height: '70%', backgroundColor: 'rgba(9, 11, 18, 0.4)' },
  scrim3: { height: '50%', backgroundColor: 'rgba(9, 11, 18, 0.7)' },
  scrim4: { height: '40%', backgroundColor: 'rgba(9, 11, 18, 0.95)' },

  backBtn: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(9, 11, 18, 0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: colors.text, fontSize: 22, lineHeight: 22 },

  topMeta: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    backgroundColor: 'rgba(9, 11, 18, 0.55)',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(217, 179, 106, 0.4)',
  },
  pillText: { ...type.label, color: colors.gold, fontSize: 10 },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg },
  eyebrow: { ...type.label, color: colors.gold, marginBottom: spacing.sm },
  name: { ...type.heroKo, color: colors.text, fontSize: 40, lineHeight: 46 },
  nameEn: { ...type.caption, color: colors.textSecondary, marginTop: 4 },
  divider: { height: 1, width: 56, backgroundColor: colors.gold, marginVertical: spacing.md },
  quote: { ...type.quoteKo, color: colors.text, fontSize: 18, lineHeight: 28 },
  quoteEn: { ...type.caption, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },
});
