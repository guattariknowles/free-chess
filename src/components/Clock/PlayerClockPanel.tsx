import type { Color } from 'chess.js';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClockTime } from '../../game/clockState';
import { useTheme, type AppTheme } from '../../theme';

type PlayerClockPanelProps = {
  color: Color;
  disabledResign: boolean;
  disabledUndo: boolean;
  facingAway?: boolean;
  isActive: boolean;
  isPaused: boolean;
  onResign: () => void;
  onUndo: () => void;
  playerName?: string;
  statusLabel?: string;
  timeMs: number | null;
  timedOut: boolean;
};

const COLOR_NAMES: Record<Color, string> = {
  b: '黑方',
  w: '白方',
};

export function PlayerClockPanel({
  color,
  disabledResign,
  disabledUndo,
  facingAway = false,
  isActive,
  isPaused,
  onResign,
  onUndo,
  playerName,
  statusLabel,
  timeMs,
  timedOut,
}: PlayerClockPanelProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const lowTime = timeMs !== null && timeMs <= 30_000;
  let stateLabel = '等待对方';

  if (timeMs === null) {
    stateLabel = '无棋钟';
  } else if (timedOut) {
    stateLabel = '时间用完';
  } else if (isPaused) {
    stateLabel = '棋钟暂停';
  } else if (isActive) {
    stateLabel = '正在走棋';
  }

  if (statusLabel) {
    stateLabel = statusLabel;
  }

  return (
    <View
      accessibilityLabel={`${COLOR_NAMES[color]}操作区`}
      style={[
        styles.panel,
        isActive && !isPaused && styles.activePanel,
        facingAway && styles.facingAway,
      ]}
    >
      <View style={styles.identity}>
        <View
          style={[
            styles.pieceMarker,
            color === 'w' ? styles.whiteMarker : styles.blackMarker,
          ]}
        />
        <View>
          <Text numberOfLines={1} style={styles.playerName}>
            {playerName ?? COLOR_NAMES[color]}
          </Text>
          <Text style={styles.stateLabel}>{stateLabel}</Text>
        </View>
      </View>

      <Text
        accessibilityLabel={`${COLOR_NAMES[color]}剩余${formatClockTime(timeMs)}`}
        style={[styles.clock, lowTime && styles.lowTime]}
      >
        {formatClockTime(timeMs)}
      </Text>

      <View style={styles.actions}>
        <PlayerAction
          disabled={disabledResign}
          label="认输"
          onPress={onResign}
        />
        <PlayerAction
          disabled={disabledUndo}
          label="悔棋"
          onPress={onUndo}
        />
      </View>
    </View>
  );
}

type PlayerActionProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function PlayerAction({
  disabled = false,
  label,
  onPress,
}: PlayerActionProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activePanel: {
    borderColor: theme.accentStrong,
  },
  facingAway: {
    transform: [{ rotate: '180deg' }],
  },
  identity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  pieceMarker: {
    borderRadius: 999,
    height: 24,
    marginRight: 8,
    width: 24,
  },
  whiteMarker: {
    backgroundColor: '#f6f2e6',
    borderColor: theme.subtleText,
    borderWidth: 2,
  },
  blackMarker: {
    backgroundColor: '#171a17',
    borderColor: theme.mutedText,
    borderWidth: 2,
  },
  playerName: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  stateLabel: {
    color: theme.subtleText,
    fontSize: 10,
    marginTop: 1,
  },
  clock: {
    color: theme.text,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 92,
    textAlign: 'center',
  },
  lowTime: {
    color: theme.danger,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: theme.elevated,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 52,
    paddingHorizontal: 8,
  },
  actionText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: theme.disabledBg,
    borderColor: theme.disabledBorder,
  },
  disabledButtonText: {
    color: theme.disabledText,
  },
  pressedButton: {
    opacity: theme.pressedOpacity,
    transform: [{ scale: 0.98 }],
  },
  });
}
