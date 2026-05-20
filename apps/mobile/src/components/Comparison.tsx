import { Image, StyleSheet, Text, View } from 'react-native';
import type { TimelineEvent } from '../shared';
import { colors, radii, spacing, type } from '../theme';
import { wikiImageSource } from '../services/images';

export function Comparison({
  failure,
  success,
  imageUrl,
}: {
  failure: TimelineEvent | undefined;
  success: TimelineEvent | undefined;
  imageUrl?: string | null;
}) {
  return (
    <View style={styles.col}>
      {failure && (
        <Row
          tone="failure"
          age={failure.age}
          title={failure.title_ko}
          desc={failure.description_ko}
          imageUrl={imageUrl}
        />
      )}
      {success && (
        <Row
          tone="success"
          age={success.age}
          title={success.title_ko}
          desc={success.description_ko}
          imageUrl={imageUrl}
        />
      )}
    </View>
  );
}

function Row({
  tone,
  age,
  title,
  desc,
  imageUrl,
}: {
  tone: 'failure' | 'success';
  age: number;
  title: string;
  desc: string;
  imageUrl?: string | null;
}) {
  const accent = tone === 'failure' ? colors.accent : colors.gold;
  const label = tone === 'failure' ? '가장 깊은 추락' : '가장 큰 도약';
  const photo = imageUrl ? wikiImageSource(imageUrl, 200) : null;
  return (
    <View style={[styles.row, { borderColor: accent }]}>
      {photo && (
        <View style={[styles.thumbWrap, { borderColor: accent }]}>
          <Image source={photo} resizeMode="cover" style={styles.thumb} />
          <View style={styles.thumbTint} pointerEvents="none" />
        </View>
      )}
      <View style={styles.body}>
        <View style={[styles.flag, { backgroundColor: accent }]}>
          <Text style={[styles.flagText, { color: tone === 'failure' ? colors.text : colors.bg }]}>
            {label}
          </Text>
        </View>
        <Text style={styles.age}>{age}세</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: spacing.md },
  row: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.bgCard,
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  thumb: { width: '100%', height: '100%' },
  thumbTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 11, 18, 0.15)',
  },
  body: { flex: 1, gap: spacing.xs },
  flag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  flagText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  age: { ...type.label, color: colors.textSecondary },
  title: { ...type.titleKo, fontSize: 18, color: colors.text, marginTop: 2 },
  desc: { ...type.bodyKo, color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 4 },
});
