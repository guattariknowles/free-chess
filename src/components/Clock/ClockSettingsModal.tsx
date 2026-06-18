import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  type ClockConfig,
  getClockConfigLabel,
  NO_CLOCK_CONFIG,
} from '../../game/clockState';
import { useTheme, type AppTheme } from '../../theme';

type ClockSettingsModalProps = {
  config: ClockConfig;
  onApply: (config: ClockConfig) => void;
  onClose: () => void;
  visible: boolean;
};

const PRESETS: Array<{ config: ClockConfig; description: string }> = [
  {
    config: { incrementMs: 0, initialTimeMs: 5 * 60_000 },
    description: '快棋',
  },
  {
    config: { incrementMs: 0, initialTimeMs: 10 * 60_000 },
    description: '常用',
  },
  {
    config: { incrementMs: 10_000, initialTimeMs: 15 * 60_000 },
    description: '每步加 10 秒',
  },
];

export function ClockSettingsModal({
  config,
  onApply,
  onClose,
  visible,
}: ClockSettingsModalProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const [minutes, setMinutes] = useState('10');
  const [incrementSeconds, setIncrementSeconds] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
    }
  }, [visible]);

  const applyCustom = () => {
    const parsedMinutes = Number(minutes);
    const parsedIncrement = Number(incrementSeconds);

    if (
      !Number.isFinite(parsedMinutes) ||
      parsedMinutes <= 0 ||
      parsedMinutes > 180
    ) {
      setError('基础时间请输入 1 到 180 分钟');
      return;
    }

    if (
      !Number.isFinite(parsedIncrement) ||
      parsedIncrement < 0 ||
      parsedIncrement > 60
    ) {
      setError('每步加秒请输入 0 到 60 秒');
      return;
    }

    onApply({
      incrementMs: Math.round(parsedIncrement * 1000),
      initialTimeMs: Math.round(parsedMinutes * 60_000),
    });
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.title}>棋钟设置</Text>
          <Text style={styles.current}>
            当前模式：{getClockConfigLabel(config)}
          </Text>

          <Text style={styles.sectionTitle}>快速选择</Text>
          <View style={styles.presetGrid}>
            <ClockOption
              description="自由练习"
              label="无棋钟"
              onPress={() => onApply(NO_CLOCK_CONFIG)}
            />
            {PRESETS.map((preset) => (
              <ClockOption
                description={preset.description}
                key={getClockConfigLabel(preset.config)}
                label={getClockConfigLabel(preset.config)}
                onPress={() => onApply(preset.config)}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>自定义</Text>
          <View style={styles.customRow}>
            <NumberField
              label="基础分钟"
              onChangeText={setMinutes}
              value={minutes}
            />
            <NumberField
              label="每步加秒"
              onChangeText={setIncrementSeconds}
              value={incrementSeconds}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={applyCustom}
              style={styles.applyButton}
            >
              <Text style={styles.applyText}>使用自定义棋钟</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ClockOptionProps = {
  description: string;
  label: string;
  onPress: () => void;
};

function ClockOption({
  description,
  label,
  onPress,
}: ClockOptionProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.pressedButton,
      ]}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </Pressable>
  );
}

type NumberFieldProps = {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
};

function NumberField({
  label,
  onChangeText,
  value,
}: NumberFieldProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        maxLength={3}
        onChangeText={onChangeText}
        selectTextOnFocus
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: theme.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 440,
    padding: 20,
    width: '100%',
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  current: {
    color: theme.mutedText,
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 18,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: theme.elevated,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: '48%',
  },
  optionLabel: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  optionDescription: {
    color: theme.subtleText,
    fontSize: 11,
    marginTop: 2,
  },
  customRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    color: theme.subtleText,
    fontSize: 11,
    marginBottom: 5,
  },
  input: {
    backgroundColor: theme.screen,
    borderColor: theme.border,
    borderRadius: 9,
    borderWidth: 1,
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 9,
    textAlign: 'center',
  },
  error: {
    color: theme.danger,
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: theme.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelText: {
    color: theme.mutedText,
    fontSize: 14,
    fontWeight: '700',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 9,
    flex: 2,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
  },
  applyText: {
    color: theme.onAccent,
    fontSize: 14,
    fontWeight: '800',
  },
  pressedButton: {
    opacity: theme.pressedOpacity,
    transform: [{ scale: 0.98 }],
  },
  });
}
