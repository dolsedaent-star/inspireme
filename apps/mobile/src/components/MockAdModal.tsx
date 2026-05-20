/**
 * Simulated interstitial ad shown in Expo Go (where native AdMob cannot run).
 * Shows a 5-second countdown, then a skip button — mimics the real interstitial UX.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

interface Props {
  visible: boolean;
  onDone: () => void;
}

const COUNTDOWN_SEC = 5;

export function MockAdModal({ visible, onDone }: Props) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SEC);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRemaining(COUNTDOWN_SEC);
  }, []);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [visible, reset]);

  const handleSkip = useCallback(() => {
    reset();
    onDone();
  }, [reset, onDone]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header bar */}
          <View style={styles.header}>
            <Text style={styles.adLabel}>광고</Text>
            <Text style={styles.devBadge}>TEST</Text>
          </View>

          {/* Ad placeholder */}
          <View style={styles.body}>
            <Text style={styles.adPlaceholderTop}>Advertisement</Text>
            <Text style={styles.adPlaceholderSub}>
              실제 빌드에서는{'\n'}Google AdMob 광고가 표시됩니다.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {remaining > 0 ? (
              <View style={styles.countdownWrap}>
                <Text style={styles.countdownNum}>{remaining}</Text>
                <Text style={styles.countdownSub}>초 후 건너뛰기</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
              >
                <Text style={styles.skipText}>건너뛰기 →</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9,11,18,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adLabel: { ...type.label, color: colors.textTertiary, fontSize: 10 },
  devBadge: {
    ...type.label,
    color: colors.gold,
    fontSize: 9,
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },

  body: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
  },
  adPlaceholderTop: {
    ...type.title,
    color: colors.textTertiary,
    fontSize: 22,
  },
  adPlaceholderSub: {
    ...type.bodyKo,
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  footer: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countdownWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  countdownNum: { ...type.titleKo, color: colors.text, fontSize: 24 },
  countdownSub: { ...type.bodyKo, color: colors.textSecondary, fontSize: 13 },

  skipBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(217,179,106,0.12)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  skipBtnPressed: { backgroundColor: 'rgba(217,179,106,0.25)' },
  skipText: { ...type.label, color: colors.gold, fontSize: 13 },
});
