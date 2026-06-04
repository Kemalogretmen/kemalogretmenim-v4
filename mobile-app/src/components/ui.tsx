import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        {...inputProps}
      />
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder = 'Seçiniz',
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.selectButton, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.selectText, !selected && styles.selectPlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.slate} />
      </Pressable>
      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.optionSheet}>
            <View style={styles.optionHead}>
              <Text style={styles.optionTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.optionClose}>
                <Ionicons name="close" size={22} color={colors.navy} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.optionList}>
              {options.length ? options.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.optionRow, item.value === value && styles.optionRowActive]}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>{item.label}</Text>
                  {item.value === value ? <Ionicons name="checkmark" size={18} color={colors.purple} /> : null}
                </Pressable>
              )) : (
                <Text style={styles.empty}>Seçenek bulunamadı.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={variant === 'primary' || variant === 'danger' ? colors.white : colors.purple} /> : null}
      <Text style={[styles.buttonText, variant !== 'primary' && variant !== 'danger' && styles.buttonTextSecondary]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Stat({ label, value, color = colors.purple }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <Card>
      <Text style={styles.empty}>{title}</Text>
    </Card>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.purple} />
      <Text style={styles.loadingText}>Yükleniyor...</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },
  header: {
    gap: 6,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: colors.slate,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.purple,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '900',
  },
  field: {
    gap: 7,
  },
  label: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.navy,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selectText: {
    color: colors.navy,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  selectPlaceholder: {
    color: colors.muted,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(26, 16, 64, 0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    maxHeight: '78%',
    paddingBottom: spacing.md,
  },
  optionHead: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  optionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
  },
  optionClose: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionList: {
    gap: 6,
    padding: spacing.md,
  },
  optionRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  optionRowActive: {
    backgroundColor: '#F8F5FF',
    borderColor: colors.purple,
  },
  optionText: {
    color: colors.slate,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  optionTextActive: {
    color: colors.purple,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  button_primary: {
    backgroundColor: colors.purple,
  },
  button_secondary: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_danger: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonTextSecondary: {
    color: colors.purple,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  stat: {
    backgroundColor: '#F8F5FF',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  empty: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.slate,
    fontWeight: '800',
  },
});
