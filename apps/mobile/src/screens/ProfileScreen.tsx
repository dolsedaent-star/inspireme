import { useState } from 'react';
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
import type { FigureCategory, Gender } from '@inspireme/shared';
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

export default function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const { saveProfile } = useUserProfile();
  const [ageText, setAgeText] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [fields, setFields] = useState<FigureCategory[]>([]);
  const [situation, setSituation] = useState('');

  const age = Number(ageText);
  const ageValid = Number.isInteger(age) && age >= 10 && age <= 100;
  const canSubmit = ageValid && gender !== null && fields.length > 0;

  const toggle = (v: FigureCategory) => {
    Haptics.selectionAsync();
    setFields((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const pickGender = (g: Gender) => {
    Haptics.selectionAsync();
    setGender(g);
  };

  const onSubmit = async () => {
    if (!canSubmit || gender === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveProfile({
      age,
      gender,
      fields,
      situation_ko: situation.trim() || undefined,
    });
    navigation.replace('Daily');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>INSPIRE ME</Text>
        <Text style={styles.title}>당신의 오늘을 한 줄로</Text>
        <Text style={styles.subtitle}>
          위인의 일대기를 당신의 나이와 상황에 비춰 보여드립니다.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>나이</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="29"
            placeholderTextColor={colors.textTertiary}
            value={ageText}
            onChangeText={setAgeText}
            maxLength={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>성별</Text>
          <View style={styles.genderRow}>
            {(
              [
                { value: 'male' as const, label: '남자' },
                { value: 'female' as const, label: '여자' },
              ] satisfies { value: Gender; label: string }[]
            ).map((opt) => {
              const active = gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => pickGender(opt.value)}
                  style={[styles.genderChip, active && styles.genderChipActive]}
                >
                  <Text style={[styles.genderText, active && styles.genderTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>관심 분야 (복수 선택)</Text>
          <View style={styles.chips}>
            {CATEGORY_OPTIONS.map((opt) => {
              const active = fields.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggle(opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>지금의 상황 (선택)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="예: 회사를 그만두고 다음 길을 고민하는 중"
            placeholderTextColor={colors.textTertiary}
            value={situation}
            onChangeText={setSituation}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
        >
          <Text style={[styles.ctaText, !canSubmit && styles.ctaTextDisabled]}>시작하기</Text>
        </Pressable>
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
  eyebrow: { ...type.section, color: colors.gold, marginBottom: spacing.sm },
  title: { ...type.heroKo, color: colors.text, marginBottom: spacing.md },
  subtitle: { ...type.bodyKo, color: colors.textSecondary, marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  label: { ...type.label, color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 18,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(217, 179, 106, 0.12)' },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: colors.gold },
  genderRow: { flexDirection: 'row', gap: spacing.md },
  genderChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
  },
  genderChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(217, 179, 106, 0.12)' },
  genderText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  genderTextActive: { color: colors.gold },
  cta: {
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ctaDisabled: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  ctaText: { color: colors.bg, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  ctaTextDisabled: { color: colors.textTertiary },
});
