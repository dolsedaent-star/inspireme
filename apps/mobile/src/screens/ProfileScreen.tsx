import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { FigureCategory, Gender } from '../shared';
import { colors, radii, spacing, type } from '../theme';
import { useUserProfile } from '../state/userProfile';
import type { ScreenProps } from '../navigation/types';

const CATEGORY_OPTIONS: { value: FigureCategory; label: string }[] = [
  { value: 'science', label: '과학' },
  { value: 'art', label: '예술' },
  { value: 'business', label: '사업' },
  { value: 'tech', label: '기술' },
  { value: 'literature', label: '문학' },
  { value: 'music', label: '음악' },
  { value: 'film', label: '영화' },
  { value: 'sports', label: '스포츠' },
  { value: 'philosophy', label: '철학' },
  { value: 'politics', label: '정치' },
  { value: 'social', label: '사회운동' },
  { value: 'exploration', label: '탐험' },
];

const STEPS = ['age', 'gender', 'fields', 'situation'] as const;
type StepKey = (typeof STEPS)[number];

export default function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const { saveProfile } = useUserProfile();
  const [stepIdx, setStepIdx] = useState(0);
  const [ageText, setAgeText] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [fields, setFields] = useState<FigureCategory[]>([]);
  const [situation, setSituation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const step: StepKey = STEPS[stepIdx];
  const age = Number(ageText);
  const ageValid = Number.isInteger(age) && age >= 10 && age <= 100;

  const canAdvance = useMemo(() => {
    if (step === 'age') return ageValid;
    if (step === 'gender') return gender !== null;
    if (step === 'fields') return fields.length > 0;
    return true; // situation is optional
  }, [step, ageValid, gender, fields]);

  const next = async () => {
    if (!canAdvance) return;
    Haptics.selectionAsync();
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
      return;
    }
    // Final step → save + go to Daily
    if (gender === null) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveProfile({
      age,
      gender,
      fields,
      situation_ko: situation.trim() || undefined,
    });
    navigation.replace('Daily');
  };

  const back = () => {
    if (stepIdx === 0) return;
    Haptics.selectionAsync();
    setStepIdx((i) => i - 1);
  };

  const toggleField = (v: FigureCategory) => {
    Haptics.selectionAsync();
    setFields((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const pickGender = (g: Gender) => {
    Haptics.selectionAsync();
    setGender(g);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.flex}>
        {/* Header: back + progress */}
        <View style={styles.header}>
          <Pressable onPress={back} hitSlop={16} disabled={stepIdx === 0} style={styles.backBtn}>
            <Text style={[styles.backArrow, stepIdx === 0 && styles.backArrowDisabled]}>←</Text>
          </Pressable>
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < stepIdx && styles.progressDotDone,
                  i === stepIdx && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>STEP {stepIdx + 1} / {STEPS.length}</Text>

          {step === 'age' && (
            <>
              <Text style={styles.question}>당신의 나이는?</Text>
              <Text style={styles.hint}>위인의 일대기를 당신의 시간 위에 비춰드립니다.</Text>
              <TextInput
                autoFocus
                style={styles.ageInput}
                keyboardType="number-pad"
                placeholder="29"
                placeholderTextColor={colors.textTertiary}
                value={ageText}
                onChangeText={setAgeText}
                maxLength={3}
              />
              <Text style={styles.ageUnit}>세</Text>
            </>
          )}

          {step === 'gender' && (
            <>
              <Text style={styles.question}>당신의 성별은?</Text>
              <Text style={styles.hint}>맞춤형 콘텐츠 추천에만 사용됩니다.</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => pickGender(g)}
                    style={[styles.genderTile, gender === g && styles.genderTileActive]}
                  >
                    <Text style={styles.genderEmoji}>{g === 'male' ? '♂' : '♀'}</Text>
                    <Text
                      style={[styles.genderLabel, gender === g && styles.genderLabelActive]}
                    >
                      {g === 'male' ? '남자' : '여자'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 'fields' && (
            <>
              <Text style={styles.question}>어떤 인생에 끌리세요?</Text>
              <Text style={styles.hint}>관심 분야 (복수 선택)</Text>
              <View style={styles.chips}>
                {CATEGORY_OPTIONS.map((opt) => {
                  const active = fields.includes(opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => toggleField(opt.value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 'situation' && (
            <>
              <Text style={styles.question}>지금 어떤 자리에 있나요?</Text>
              <Text style={styles.hint}>한 줄로 적어도 좋고, 건너뛰어도 됩니다.</Text>
              <TextInput
                style={styles.situationInput}
                placeholder="예: 회사를 그만두고 다음 길을 고민하는 중"
                placeholderTextColor={colors.textTertiary}
                value={situation}
                onChangeText={setSituation}
                multiline
                numberOfLines={4}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={next}
            disabled={!canAdvance || submitting}
            style={[styles.cta, (!canAdvance || submitting) && styles.ctaDisabled]}
          >
            <Text style={[styles.ctaText, (!canAdvance || submitting) && styles.ctaTextDisabled]}>
              {stepIdx === STEPS.length - 1 ? '시작하기' : '다음'}
            </Text>
          </Pressable>
          {step === 'situation' && (
            <Pressable onPress={next} hitSlop={12} style={styles.skipBtn}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.text, fontSize: 22 },
  backArrowDisabled: { color: colors.textTertiary },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotDone: { backgroundColor: colors.goldMuted },
  progressDotActive: { backgroundColor: colors.gold },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  eyebrow: { ...type.label, color: colors.gold, marginBottom: spacing.md },
  question: { ...type.heroKo, color: colors.text, fontSize: 32, lineHeight: 40, marginBottom: spacing.sm },
  hint: { ...type.bodyKo, color: colors.textSecondary, marginBottom: spacing.xxl },

  // age step
  ageInput: {
    color: colors.gold,
    fontSize: 96,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -2,
    padding: 0,
  },
  ageUnit: { ...type.titleKo, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },

  // gender step
  genderRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  genderTile: {
    flex: 1,
    paddingVertical: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    gap: spacing.md,
  },
  genderTileActive: { borderColor: colors.gold, backgroundColor: 'rgba(217, 179, 106, 0.08)' },
  genderEmoji: { fontSize: 48, color: colors.text },
  genderLabel: { ...type.titleKo, fontSize: 20, color: colors.textSecondary },
  genderLabelActive: { color: colors.gold },

  // fields step
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(217, 179, 106, 0.12)' },
  chipText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  chipTextActive: { color: colors.gold },

  // situation step
  situationInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // footer
  footer: { padding: spacing.lg, gap: spacing.sm },
  cta: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  ctaTextDisabled: { color: colors.textTertiary },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { color: colors.textSecondary, fontSize: 14 },
});
