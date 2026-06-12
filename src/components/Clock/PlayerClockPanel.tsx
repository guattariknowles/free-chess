import type { Color } from 'chess.js';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClockTime } from '../../game/clockState';

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
  timeMs,
  timedOut,
}: PlayerClockPanelProps) {
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

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activePanel: {
    borderColor: '#d49a43',
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
    borderColor: '#747a72',
    borderWidth: 2,
  },
  blackMarker: {
    backgroundColor: '#171a17',
    borderColor: '#b5bbb2',
    borderWidth: 2,
  },
  playerName: {
    color: '#f3f0e7',
    fontSize: 15,
    fontWeight: '800',
  },
  stateLabel: {
    color: '#90988f',
    fontSize: 10,
    marginTop: 1,
  },
  clock: {
    color: '#f5f1e7',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 92,
    textAlign: 'center',
  },
  lowTime: {
    color: '#ef725f',
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#444c44',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 52,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#ebe8df',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#202420',
    borderColor: '#2d322d',
  },
  disabledButtonText: {
    color: '#5f665f',
  },
  pressedButton: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
