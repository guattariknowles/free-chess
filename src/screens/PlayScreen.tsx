import type { Color, Square } from 'chess.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChessBoard } from '../components/Board/ChessBoard';
import { ClockSettingsModal } from '../components/Clock/ClockSettingsModal';
import { PlayerClockPanel } from '../components/Clock/PlayerClockPanel';
import {
  type ClockConfig,
  type ClockState,
  createClockState,
  getClockConfigLabel,
  isClockEnabled,
  NO_CLOCK_CONFIG,
  pauseClock,
  restoreClock,
  resumeClock,
  stopClock,
  switchClock,
  tickClock,
} from '../game/clockState';
import {
  ChessGame,
  type GameSnapshot,
  type LegalMove,
  type PromotionPiece,
} from '../game/chessState';
import {
  createGameRecord,
  type GameRecord,
  type GameResult,
} from '../game/gameRecord';
import { saveGameRecord } from '../game/gameLibraryStorage';
import { GameLibraryScreen } from './GameLibraryScreen';
import { ReviewScreen } from './ReviewScreen';

type PendingPromotion = {
  from: Square;
  moves: LegalMove[];
  to: Square;
};

type GameOutcome = {
  description: string;
  reason: 'checkmate' | 'draw' | 'resignation' | 'timeout';
  title: string;
  winner?: Color;
};

const COLOR_NAMES: Record<Color, string> = {
  b: '黑方',
  w: '白方',
};

const PROMOTION_OPTIONS: Array<{
  label: string;
  piece: PromotionPiece;
  symbol: string;
}> = [
  { label: '后', piece: 'q', symbol: '♕' },
  { label: '车', piece: 'r', symbol: '♖' },
  { label: '象', piece: 'b', symbol: '♗' },
  { label: '马', piece: 'n', symbol: '♘' },
];

function getOpponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

function getBoardOutcome(snapshot: GameSnapshot): GameOutcome | null {
  if (snapshot.status.isCheckmate && snapshot.status.winner) {
    return {
      description: '将死，对局已经结束',
      reason: 'checkmate',
      title: `${COLOR_NAMES[snapshot.status.winner]}获胜`,
      winner: snapshot.status.winner,
    };
  }

  if (snapshot.status.isDraw) {
    return {
      description: snapshot.status.message,
      reason: 'draw',
      title: '本局和棋',
    };
  }

  return null;
}

function getPgnDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

function getOutcomeResult(outcome: GameOutcome | null): GameResult {
  if (!outcome) {
    return '*';
  }

  if (outcome.reason === 'draw') {
    return '1/2-1/2';
  }

  return outcome.winner === 'w' ? '1-0' : '0-1';
}

function getTimeControl(config: ClockConfig): string {
  if (config.initialTimeMs === null) {
    return '-';
  }

  return `${Math.round(config.initialTimeMs / 1000)}+${
    config.incrementMs / 1000
  }`;
}

export function PlayScreen() {
  const gameRef = useRef(new ChessGame());
  const gameStartedAtRef = useRef(new Date());
  const currentRecordIdRef = useRef<string | null>(null);
  const clockRef = useRef(
    createClockState(NO_CLOCK_CONFIG, Date.now()),
  );
  const clockHistoryRef = useRef<ClockState[]>([]);
  const [snapshot, setSnapshot] = useState(() =>
    gameRef.current.getSnapshot(),
  );
  const [clockConfig, setClockConfig] =
    useState<ClockConfig>(NO_CLOCK_CONFIG);
  const [clock, setClock] = useState(clockRef.current);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [feedback, setFeedback] = useState(
    '点击棋子，再点击高亮格子完成走棋',
  );
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [reviewRecord, setReviewRecord] = useState<GameRecord | null>(null);
  const [reviewReturn, setReviewReturn] =
    useState<'library' | 'play'>('play');
  const [clockSettingsVisible, setClockSettingsVisible] = useState(false);
  const { height, width } = useWindowDimensions();
  const boardSize = Math.floor(
    Math.min(width - 24, Math.max(236, height - 430), 520),
  );
  const legalMoves = useMemo(
    () =>
      selectedSquare
        ? gameRef.current.getLegalMoves(selectedSquare)
        : [],
    [selectedSquare, snapshot.fen],
  );
  const pieces = useMemo(
    () => new Map(snapshot.board.map((piece) => [piece.square, piece])),
    [snapshot.board],
  );
  const clockEnabled = isClockEnabled(clock);
  const clockPaused = clockEnabled && clock.isPaused;

  const applyClockState = (next: ClockState) => {
    clockRef.current = next;
    setClock(next);
  };

  const clearSelection = () => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  };

  function buildCurrentRecord(): GameRecord {
    const result = getOutcomeResult(outcome);
    const pgn = gameRef.current.getPgn({
      Black: '黑方',
      Date: getPgnDate(gameStartedAtRef.current),
      Event: 'Free Chess 本地对局',
      Result: result,
      Site: 'Local',
      TimeControl: getTimeControl(clockConfig),
      White: '白方',
    });
    const record = createGameRecord({
      clockLabel: getClockConfigLabel(clockConfig),
      createdAt: gameStartedAtRef.current.toISOString(),
      id: currentRecordIdRef.current ?? undefined,
      pgn,
      result,
      source: 'played',
    });

    currentRecordIdRef.current = record.id;
    return record;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const current = clockRef.current;
      const updated = tickClock(current, Date.now());

      if (updated !== current) {
        clockRef.current = updated;
        setClock(updated);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!clock.timedOutColor || outcome) {
      return;
    }

    const winner = getOpponent(clock.timedOutColor);
    clearSelection();
    setOutcome({
      description: `${COLOR_NAMES[clock.timedOutColor]}时间用完`,
      reason: 'timeout',
      title: `${COLOR_NAMES[winner]}获胜`,
      winner,
    });
    setFeedback(`${COLOR_NAMES[clock.timedOutColor]}超时`);
    setResultVisible(true);
  }, [clock.timedOutColor, outcome]);

  useEffect(() => {
    if (!outcome) {
      return;
    }

    let active = true;
    const record = buildCurrentRecord();

    saveGameRecord(record)
      .then(() => {
        if (active) {
          setFeedback(`${outcome.description}，棋谱已自动保存`);
        }
      })
      .catch(() => {
        if (active) {
          setFeedback(`${outcome.description}，但自动保存棋谱失败`);
        }
      });

    return () => {
      active = false;
    };
  }, [outcome]);

  const finishGame = (result: GameOutcome, now = Date.now()) => {
    applyClockState(stopClock(clockRef.current, now));
    clearSelection();
    setOutcome(result);
    setFeedback(result.description);
    setResultVisible(true);
  };

  const commitMove = (
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ) => {
    const now = Date.now();
    const settledClock = tickClock(clockRef.current, now);
    applyClockState(settledClock);

    if (settledClock.timedOutColor) {
      return;
    }

    const result = gameRef.current.move(from, to, promotion);

    if (!result.success) {
      setFeedback(
        result.reason === 'game_over'
          ? '本局已经结束，请重新开始'
          : '该走法不符合国际象棋规则',
      );
      return;
    }

    clockHistoryRef.current.push(settledClock);
    const switchedClock = switchClock(
      settledClock,
      result.snapshot.status.turn,
      now,
    );

    applyClockState(
      result.snapshot.status.isGameOver
        ? stopClock(switchedClock, now)
        : switchedClock,
    );
    setSnapshot(result.snapshot);
    setFeedback(`已走 ${result.move.san}`);
    clearSelection();

    const boardOutcome = getBoardOutcome(result.snapshot);

    if (boardOutcome) {
      setOutcome(boardOutcome);
      setFeedback(boardOutcome.description);
      setResultVisible(true);
    }
  };

  const handleSquarePress = (square: Square) => {
    if (outcome || snapshot.status.isGameOver) {
      setFeedback('本局已经结束，请重新开始或回顾棋局');
      return;
    }

    if (clockPaused) {
      setFeedback(
        snapshot.moveCount === 0
          ? '请先点击“开始棋钟”'
          : '棋钟已暂停，请先继续',
      );
      return;
    }

    const piece = pieces.get(square);

    if (!selectedSquare) {
      if (!piece) {
        setFeedback('请先选择一个棋子');
        return;
      }

      if (piece.color !== snapshot.status.turn) {
        setFeedback(
          `现在轮到${COLOR_NAMES[snapshot.status.turn]}走棋`,
        );
        return;
      }

      setSelectedSquare(square);
      setFeedback('请选择一个高亮格子');
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      setFeedback('已取消选择');
      return;
    }

    if (piece?.color === snapshot.status.turn) {
      setSelectedSquare(square);
      setFeedback('已改选棋子');
      return;
    }

    const matchingMoves = legalMoves.filter((move) => move.to === square);

    if (matchingMoves.length === 0) {
      setFeedback('该棋子不能走到这里');
      return;
    }

    const promotionMoves = matchingMoves.filter((move) => move.promotion);

    if (promotionMoves.length > 0) {
      setPendingPromotion({
        from: selectedSquare,
        moves: promotionMoves,
        to: square,
      });
      return;
    }

    commitMove(selectedSquare, square);
  };

  const handleUndo = (color: Color) => {
    if (snapshot.status.turn !== color) {
      setFeedback(`现在应由${COLOR_NAMES[snapshot.status.turn]}操作悔棋`);
      return;
    }

    if (!snapshot.canUndo) {
      setFeedback('当前没有可以撤回的走法');
      return;
    }

    if (outcome?.reason === 'resignation' || outcome?.reason === 'timeout') {
      setFeedback('投降或超时后不能悔棋，请重新开始');
      return;
    }

    const previousClock = clockHistoryRef.current.pop();
    const nextSnapshot = gameRef.current.undo();

    if (previousClock) {
      applyClockState(restoreClock(previousClock, Date.now()));
    }

    setSnapshot(nextSnapshot);
    setOutcome(null);
    setResultVisible(false);
    clearSelection();
    setFeedback(`${COLOR_NAMES[color]}已撤回上一步`);
  };

  const startNewGame = (config = clockConfig) => {
    const nextClock = createClockState(config, Date.now());

    setSnapshot(gameRef.current.reset());
    gameStartedAtRef.current = new Date();
    currentRecordIdRef.current = null;
    setClockConfig(config);
    applyClockState(nextClock);
    clockHistoryRef.current = [];
    setFlipped(false);
    setOutcome(null);
    setResultVisible(false);
    setReviewRecord(null);
    setLibraryVisible(false);
    clearSelection();
    setFeedback(
      config.initialTimeMs === null
        ? '新对局已开始'
        : '新对局已准备，请点击“开始棋钟”',
    );
  };

  const handleReset = () => {
    if (!snapshot.canUndo && !outcome) {
      startNewGame();
      return;
    }

    Alert.alert('重新开始？', '当前对局和棋钟会被清除。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: () => startNewGame(),
        style: 'destructive',
        text: '重新开始',
      },
    ]);
  };

  const handleApplyClockConfig = (config: ClockConfig) => {
    const apply = () => {
      setClockSettingsVisible(false);
      startNewGame(config);
    };

    if (!snapshot.canUndo && !outcome) {
      apply();
      return;
    }

    Alert.alert(
      '更换棋钟并重新开始？',
      '为保证双方时间公平，更换棋钟会开始一盘新对局。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: apply, style: 'destructive', text: '确认更换' },
      ],
    );
  };

  const handlePauseToggle = () => {
    if (!clockEnabled || outcome) {
      return;
    }

    const now = Date.now();

    if (clock.isPaused) {
      applyClockState(resumeClock(clock, now));
      setFeedback(
        snapshot.moveCount === 0 ? '棋钟已开始' : '棋钟继续计时',
      );
    } else {
      applyClockState(pauseClock(clock, now));
      clearSelection();
      setFeedback('棋钟已暂停');
    }
  };

  const handleResign = (color: Color) => {
    if (outcome) {
      return;
    }

    const winner = getOpponent(color);

    Alert.alert(
      `${COLOR_NAMES[color]}确认认输？`,
      `确认后，${COLOR_NAMES[winner]}立即获胜。`,
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () =>
            finishGame({
              description: `${COLOR_NAMES[color]}认输`,
              reason: 'resignation',
              title: `${COLOR_NAMES[winner]}获胜`,
              winner,
            }),
          style: 'destructive',
          text: '确认认输',
        },
      ],
    );
  };

  const choosePromotion = (promotion: PromotionPiece) => {
    if (!pendingPromotion) {
      return;
    }

    const allowed = pendingPromotion.moves.some(
      (move) => move.promotion === promotion,
    );

    if (!allowed) {
      setFeedback('这个升变选项不可用');
      return;
    }

    commitMove(pendingPromotion.from, pendingPromotion.to, promotion);
  };

  if (reviewRecord) {
    return (
      <ReviewScreen
        onBack={() => {
          setReviewRecord(null);
          setLibraryVisible(reviewReturn === 'library');
        }}
        onRestart={() => startNewGame()}
        record={reviewRecord}
      />
    );
  }

  if (libraryVisible) {
    return (
      <GameLibraryScreen
        canSaveCurrent={snapshot.moveCount > 0}
        onBack={() => setLibraryVisible(false)}
        onBuildCurrentRecord={buildCurrentRecord}
        onOpenRecord={(record) => {
          setReviewReturn('library');
          setLibraryVisible(false);
          setReviewRecord(record);
        }}
      />
    );
  }

  const undoBlockedByOutcome =
    outcome?.reason === 'resignation' || outcome?.reason === 'timeout';

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { minHeight: height }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Free Chess</Text>
            <Text style={styles.subtitle}>
              {getClockConfigLabel(clockConfig)} · 已走 {snapshot.moveCount} 步
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLibraryVisible(true)}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.headerButtonText}>棋谱</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setClockSettingsVisible(true)}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.headerButtonText}>棋钟</Text>
            </Pressable>
          </View>
        </View>

        <PlayerClockPanel
          color="b"
          disabledResign={Boolean(outcome)}
          disabledUndo={
            !snapshot.canUndo ||
            snapshot.status.turn !== 'b' ||
            undoBlockedByOutcome
          }
          facingAway
          isActive={snapshot.status.turn === 'b' && !outcome}
          isPaused={clockPaused}
          onResign={() => handleResign('b')}
          onUndo={() => handleUndo('b')}
          timeMs={clock.blackTimeMs}
          timedOut={clock.timedOutColor === 'b'}
        />

        <View style={styles.boardWrap}>
          <ChessBoard
            board={snapshot.board}
            flipped={flipped}
            lastMove={snapshot.lastMove}
            legalMoves={legalMoves}
            onSquarePress={handleSquarePress}
            selectedSquare={selectedSquare}
            size={boardSize}
          />
        </View>

        <PlayerClockPanel
          color="w"
          disabledResign={Boolean(outcome)}
          disabledUndo={
            !snapshot.canUndo ||
            snapshot.status.turn !== 'w' ||
            undoBlockedByOutcome
          }
          isActive={snapshot.status.turn === 'w' && !outcome}
          isPaused={clockPaused}
          onResign={() => handleResign('w')}
          onUndo={() => handleUndo('w')}
          timeMs={clock.whiteTimeMs}
          timedOut={clock.timedOutColor === 'w'}
        />

        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.statusPanel,
            outcome && styles.finishedStatusPanel,
          ]}
        >
          <View
            style={[
              styles.turnMarker,
              snapshot.status.turn === 'w'
                ? styles.whiteTurnMarker
                : styles.blackTurnMarker,
            ]}
          />
          <View style={styles.statusTextGroup}>
            <Text style={styles.statusText}>
              {outcome?.title ?? snapshot.status.message}
            </Text>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        </View>

        <View style={styles.globalControls}>
          <ControlButton
            disabled={!clockEnabled || Boolean(outcome)}
            label={
              clock.isPaused
                ? snapshot.moveCount === 0
                  ? '开始棋钟'
                  : '继续'
                : '暂停'
            }
            onPress={handlePauseToggle}
          />
          <ControlButton
            label="翻转棋盘"
            onPress={() => {
              setFlipped((value) => !value);
              clearSelection();
              setFeedback('棋盘方向已翻转');
            }}
          />
          <ControlButton label="重新开始" onPress={handleReset} />
        </View>
      </ScrollView>

      <ClockSettingsModal
        config={clockConfig}
        onApply={handleApplyClockConfig}
        onClose={() => setClockSettingsVisible(false)}
        visible={clockSettingsVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setPendingPromotion(null)}
        transparent
        visible={pendingPromotion !== null}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.dialogTitle}>兵升变</Text>
            <Text style={styles.dialogDescription}>
              请选择要变成的棋子
            </Text>
            <View style={styles.promotionOptions}>
              {PROMOTION_OPTIONS.map((option) => (
                <Pressable
                  accessibilityLabel={`升变为${option.label}`}
                  accessibilityRole="button"
                  key={option.piece}
                  onPress={() => choosePromotion(option.piece)}
                  style={({ pressed }) => [
                    styles.promotionButton,
                    pressed && styles.pressedButton,
                  ]}
                >
                  <Text style={styles.promotionSymbol}>{option.symbol}</Text>
                  <Text style={styles.promotionLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPendingPromotion(null)}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setResultVisible(false)}
        transparent
        visible={resultVisible && outcome !== null}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.resultEyebrow}>对局结束</Text>
            <Text style={styles.resultTitle}>{outcome?.title}</Text>
            <Text style={styles.dialogDescription}>
              {outcome?.description}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => startNewGame()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>重新开始</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setResultVisible(false);
                const record = buildCurrentRecord();
                setReviewReturn('play');
                setReviewRecord(record);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>回顾棋局</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setResultVisible(false)}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>查看最终棋盘</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type ControlButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function ControlButton({
  disabled = false,
  label,
  onPress,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.controlButtonText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#171a18',
    flex: 1,
  },
  content: {
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingBottom: 22,
    paddingHorizontal: 12,
    paddingTop: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  title: {
    color: '#f4f1e8',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#9ca49a',
    fontSize: 11,
    marginTop: 1,
  },
  headerButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#e5e2d9',
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 7,
  },
  boardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statusPanel: {
    alignItems: 'center',
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 9,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  finishedStatusPanel: {
    borderColor: '#8c6230',
  },
  turnMarker: {
    borderRadius: 999,
    height: 24,
    marginRight: 10,
    width: 24,
  },
  whiteTurnMarker: {
    backgroundColor: '#f6f2e6',
    borderColor: '#6e756c',
    borderWidth: 2,
  },
  blackTurnMarker: {
    backgroundColor: '#20231f',
    borderColor: '#aeb5ac',
    borderWidth: 2,
  },
  statusTextGroup: {
    flex: 1,
  },
  statusText: {
    color: '#f3f0e7',
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackText: {
    color: '#aeb5ac',
    fontSize: 11,
    marginTop: 2,
  },
  globalControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: '#2a302a',
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  controlButtonText: {
    color: '#f0ede4',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#202420',
    borderColor: '#2d322d',
  },
  disabledButtonText: {
    color: '#606760',
  },
  pressedButton: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#242924',
    borderColor: '#4a5149',
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  dialogTitle: {
    color: '#f4f1e8',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  dialogDescription: {
    color: '#aeb5ac',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  promotionOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  promotionButton: {
    alignItems: 'center',
    backgroundColor: '#333a33',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  promotionSymbol: {
    color: '#fffdf3',
    fontFamily: 'serif',
    fontSize: 36,
  },
  promotionLabel: {
    color: '#d9ddd5',
    fontSize: 12,
    marginTop: 2,
  },
  resultEyebrow: {
    color: '#d49a43',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  resultTitle: {
    color: '#f8f3e8',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 7,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#fff7e8',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#525a51',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 9,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#e8e5dc',
    fontSize: 14,
    fontWeight: '700',
  },
  textButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 9,
  },
  textButtonLabel: {
    color: '#d1a356',
    fontSize: 13,
    fontWeight: '700',
  },
});
