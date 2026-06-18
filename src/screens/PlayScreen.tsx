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
import { chessEngine } from '../engine/defaultEngine';
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
import {
  type AiDifficulty,
  getAiGameParticipants,
} from '../game/localAi';
import {
  completeSeriesGame,
  getSeriesResultLabel,
  getSeriesStageLabel,
  type SeriesRecord,
  updateSeriesProgress,
} from '../game/series';
import {
  loadActiveSeries,
  saveSeriesRecord,
} from '../game/seriesStorage';
import {
  selectDistinctPlayerProfiles,
  type UserProfile,
} from '../game/userProfile';
import { loadUserProfiles } from '../game/userProfileStorage';
import { GameLibraryScreen } from './GameLibraryScreen';
import { LearnScreen } from './LearnScreen';
import { PositionEditorScreen } from './PositionEditorScreen';
import { ReviewScreen } from './ReviewScreen';
import { SeriesDetailScreen } from './SeriesDetailScreen';
import { SeriesSetupScreen } from './SeriesSetupScreen';
import { UserProfilesScreen } from './UserProfilesScreen';
import {
  APP_THEME_OPTIONS,
  BOARD_SKIN_OPTIONS,
  PIECE_SKIN_OPTIONS,
  useTheme,
  type AppTheme,
  type BoardSkin,
  type BoardSkinId,
  type PieceSkinId,
  type ThemeId,
} from '../theme';

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

type GameMode = 'ai' | 'local';
type HumanColorChoice = 'black' | 'random' | 'white';

const COLOR_NAMES: Record<Color, string> = {
  b: '黑方',
  w: '白方',
};

const AI_DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  novice: '新手：短时低强度计算',
  beginner: '初级：低强度局面计算',
  intermediate: '中级：更深入局面计算',
};

const HUMAN_COLOR_LABELS: Record<HumanColorChoice, string> = {
  white: '真人执白',
  black: '真人执黑',
  random: '随机颜色',
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

function chooseHumanColor(
  choice: HumanColorChoice,
  random: () => number = Math.random,
): Color {
  if (choice === 'white') {
    return 'w';
  }

  if (choice === 'black') {
    return 'b';
  }

  return random() < 0.5 ? 'w' : 'b';
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
  const {
    appTheme,
    boardSkin,
    pieceSkin,
    setAppThemeId,
    setBoardSkinId,
    setPieceSkinId,
    settings,
  } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const gameRef = useRef(new ChessGame());
  const gameStartedAtRef = useRef(new Date());
  const currentInitialFenRef = useRef<string | undefined>(undefined);
  const currentRecordIdRef = useRef<string | null>(null);
  const completedRecordRef = useRef<GameRecord | null>(null);
  const aiTaskRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTaskVersionRef = useRef(0);
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
  const [learnVisible, setLearnVisible] = useState(false);
  const [profilesVisible, setProfilesVisible] = useState(false);
  const [positionEditorVisible, setPositionEditorVisible] = useState(false);
  const [seriesSetupVisible, setSeriesSetupVisible] = useState(false);
  const [playerSetupVisible, setPlayerSetupVisible] = useState(false);
  const [profilesReady, setProfilesReady] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [whitePlayer, setWhitePlayer] = useState<UserProfile | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<UserProfile | null>(null);
  const [pendingWhiteId, setPendingWhiteId] = useState<string | null>(null);
  const [pendingBlackId, setPendingBlackId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [pendingGameMode, setPendingGameMode] =
    useState<GameMode>('local');
  const [aiDifficulty, setAiDifficulty] =
    useState<AiDifficulty>('novice');
  const [pendingAiDifficulty, setPendingAiDifficulty] =
    useState<AiDifficulty>('novice');
  const [humanColorChoice, setHumanColorChoice] =
    useState<HumanColorChoice>('white');
  const [pendingHumanColorChoice, setPendingHumanColorChoice] =
    useState<HumanColorChoice>('white');
  const [humanPlayer, setHumanPlayer] = useState<UserProfile | null>(null);
  const [pendingHumanId, setPendingHumanId] = useState<string | null>(
    null,
  );
  const [aiColor, setAiColor] = useState<Color | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameSession, setGameSession] = useState(0);
  const [activeSeries, setActiveSeries] = useState<SeriesRecord | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesRecord | null>(null);
  const [reviewRecord, setReviewRecord] = useState<GameRecord | null>(null);
  const [reviewReturn, setReviewReturn] =
    useState<'library' | 'play' | 'series'>('play');
  const [clockSettingsVisible, setClockSettingsVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const engineInteractionBlocked =
    profilesVisible ||
    positionEditorVisible ||
    seriesSetupVisible ||
    Boolean(reviewRecord) ||
    Boolean(seriesDetail) ||
    libraryVisible ||
    learnVisible ||
    playerSetupVisible ||
    clockSettingsVisible ||
    appearanceVisible;
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
  const aiParticipants = useMemo(
    () =>
      gameMode === 'ai' && humanPlayer && aiColor
        ? getAiGameParticipants(
            humanPlayer,
            aiDifficulty,
            getOpponent(aiColor),
          )
        : null,
    [aiColor, aiDifficulty, gameMode, humanPlayer],
  );

  const applyClockState = (next: ClockState) => {
    clockRef.current = next;
    setClock(next);
  };

  const clearSelection = () => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  };

  const cancelAiTask = () => {
    aiTaskVersionRef.current += 1;
    void chessEngine.stop();

    if (aiTaskRef.current) {
      clearTimeout(aiTaskRef.current);
      aiTaskRef.current = null;
    }

    setAiThinking(false);
  };

  const getParticipant = (color: Color) => {
    if (aiParticipants) {
      return aiParticipants[color];
    }

    const profile = color === 'w' ? whitePlayer : blackPlayer;
    return {
      isAi: false,
      name: profile?.name ?? COLOR_NAMES[color],
      profileId: profile?.id,
    };
  };

  const getProfileFromSeries = (
    series: SeriesRecord,
    profileId: string,
  ): UserProfile =>
    profileId === series.playerOne.id
      ? series.playerOne
      : series.playerTwo;

  const applyPlayers = (white: UserProfile, black: UserProfile) => {
    setWhitePlayer(white);
    setBlackPlayer(black);
    setPendingWhiteId(white.id);
    setPendingBlackId(black.id);
  };

  function buildCurrentRecord(): GameRecord {
    const result = getOutcomeResult(outcome);
    const currentSeriesGame = activeSeries?.currentGame;
    const white = getParticipant('w');
    const black = getParticipant('b');
    const pgn = gameRef.current.getPgn({
      Black: black.name,
      Date: getPgnDate(gameStartedAtRef.current),
      Event: activeSeries
        ? `Free Chess ${activeSeries.title}`
        : gameMode === 'ai'
          ? 'Free Chess 人机对局'
          : 'Free Chess 本地对局',
      Result: result,
      Site: 'Local',
      TimeControl: getTimeControl(clockConfig),
      White: white.name,
    });
    const record = createGameRecord({
      blackProfileId: black.profileId,
      clockLabel: getClockConfigLabel(clockConfig),
      createdAt: gameStartedAtRef.current.toISOString(),
      id: currentRecordIdRef.current ?? undefined,
      initialFen: currentInitialFenRef.current,
      pgn,
      result,
      seriesGameNumber: currentSeriesGame?.gameNumber,
      seriesId: activeSeries?.id,
      source: 'played',
      whiteProfileId: white.profileId,
    });

    currentRecordIdRef.current = record.id;
    return record;
  }

  const persistSeriesProgress = (
    series: SeriesRecord,
    nextClock: ClockState,
  ) => {
    const pgn = gameRef.current.getPgn({
      Black: blackPlayer?.name ?? '黑方',
      Date: getPgnDate(gameStartedAtRef.current),
      Event: `Free Chess ${series.title}`,
      Result: '*',
      Site: 'Local',
      TimeControl: getTimeControl(clockConfig),
      White: whitePlayer?.name ?? '白方',
    });
    const updated = updateSeriesProgress(series, {
      clockState: {
        ...nextClock,
        isPaused: true,
      },
      pgn,
    });

    setActiveSeries(updated);
    saveSeriesRecord(updated).catch(() => {
      setFeedback('当前走法已完成，但系列赛断点保存失败');
    });
  };

  function resumeSeries(series: SeriesRecord) {
    const current = series.currentGame;

    if (!current) {
      setSeriesDetail(series);
      return;
    }

    const game = new ChessGame();

    if (current.pgn) {
      try {
        game.loadPgn(current.pgn);
      } catch {
        setFeedback('系列赛当前棋谱损坏，已从本局初始位置继续');
      }
    }

    gameRef.current = game;
    currentInitialFenRef.current = undefined;
    gameStartedAtRef.current = new Date(current.startedAt);
    currentRecordIdRef.current = null;
    completedRecordRef.current = null;
    setGameSession((value) => value + 1);
    clockHistoryRef.current = [];
    cancelAiTask();
    const restoredClock = current.clockState
      ? restoreClock(
          {
            ...current.clockState,
            isPaused: true,
          },
          Date.now(),
        )
      : createClockState(current.clockConfig, Date.now());

    applyClockState(restoredClock);
    setClockConfig(current.clockConfig);
    setSnapshot(game.getSnapshot());
    applyPlayers(
      getProfileFromSeries(series, current.whiteProfileId),
      getProfileFromSeries(series, current.blackProfileId),
    );
    setGameMode('local');
    setAiColor(null);
    setHumanPlayer(null);
    setActiveSeries(series);
    setOutcome(null);
    setResultVisible(false);
    setLibraryVisible(false);
    setSeriesDetail(null);
    clearSelection();
    setFeedback(
      current.pgn
        ? '已恢复当前系列赛，本局棋钟保持暂停'
        : '系列赛本局已准备',
    );
  }

  useEffect(() => {
    let active = true;

    Promise.all([loadUserProfiles(), loadActiveSeries()])
      .then(([loadedProfiles, storedSeries]) => {
        if (!active) {
          return;
        }

        setProfiles(loadedProfiles);

        if (storedSeries?.currentGame) {
          resumeSeries(storedSeries);
        } else if (loadedProfiles.length >= 2) {
          applyPlayers(loadedProfiles[0], loadedProfiles[1]);
        } else if (loadedProfiles.length === 1) {
          setWhitePlayer(loadedProfiles[0]);
          setBlackPlayer(null);
          setHumanPlayer(loadedProfiles[0]);
          setPendingHumanId(loadedProfiles[0].id);
          setPlayerSetupVisible(true);
        } else {
          setProfilesVisible(true);
        }

        setProfilesReady(true);
      })
      .catch(() => {
        if (active) {
          setProfilesReady(true);
          setProfilesVisible(true);
          setFeedback('读取本地档案失败，请先检查档案管理');
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
    completedRecordRef.current = record;
    const save = activeSeries
      ? (() => {
          try {
            const updated = completeSeriesGame(activeSeries, record);
            setActiveSeries(updated);
            return saveSeriesRecord(updated).then(() => {
              if (active) {
                setFeedback(
                  updated.status === 'completed'
                    ? `${outcome.description}，系列赛已经结束`
                    : `${outcome.description}，比分已记录，可开始下一局`,
                );
              }
            });
          } catch (error) {
            return Promise.reject(error);
          }
        })()
      : saveGameRecord(record).then(() => {
          if (active) {
            setFeedback(`${outcome.description}，棋谱已自动保存`);
          }
        });

    save.catch(() => {
      if (active) {
        setFeedback(`${outcome.description}，但自动保存失败`);
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
    const nextClock = result.snapshot.status.isGameOver
      ? stopClock(switchedClock, now)
      : switchedClock;

    applyClockState(nextClock);
    setSnapshot(result.snapshot);
    setFeedback(`已走 ${result.move.san}`);
    clearSelection();

    const boardOutcome = getBoardOutcome(result.snapshot);

    if (boardOutcome) {
      setOutcome(boardOutcome);
      setFeedback(boardOutcome.description);
      setResultVisible(true);
    } else if (activeSeries) {
      persistSeriesProgress(activeSeries, nextClock);
    }
  };

  useEffect(() => {
    cancelAiTask();

    if (
      gameMode !== 'ai' ||
      !aiColor ||
      snapshot.status.turn !== aiColor ||
      snapshot.status.isGameOver ||
      outcome ||
      clock.timedOutColor ||
      engineInteractionBlocked ||
      (clockEnabled && clock.isPaused)
    ) {
      return;
    }

    const scheduledFen = snapshot.fen;
    const taskVersion = aiTaskVersionRef.current;
    setAiThinking(true);
    setFeedback('AI 正在思考');

    aiTaskRef.current = setTimeout(async () => {
      aiTaskRef.current = null;

      if (
        taskVersion !== aiTaskVersionRef.current ||
        gameRef.current.getSnapshot().fen !== scheduledFen ||
        gameRef.current.getSnapshot().status.turn !== aiColor ||
        gameRef.current.getSnapshot().status.isGameOver
      ) {
        return;
      }

      const settledClock = tickClock(clockRef.current, Date.now());
      applyClockState(settledClock);

      if (
        settledClock.timedOutColor ||
        (isClockEnabled(settledClock) && settledClock.isPaused)
      ) {
        setAiThinking(false);
        return;
      }

      const result = await chessEngine.getBestMove(
        scheduledFen,
        {
          difficulty: aiDifficulty,
        },
      );

      if (
        taskVersion !== aiTaskVersionRef.current ||
        gameRef.current.getSnapshot().fen !== scheduledFen ||
        gameRef.current.getSnapshot().status.turn !== aiColor ||
        gameRef.current.getSnapshot().status.isGameOver
      ) {
        return;
      }

      setAiThinking(false);

      if (!result.move) {
        return;
      }

      commitMove(
        result.move.from,
        result.move.to,
        result.move.promotion,
      );

      if (
        result.fallbackReason &&
        !gameRef.current.getSnapshot().status.isGameOver
      ) {
        setFeedback(
          `Stockfish 暂不可用，已由简易 AI 回应 ${result.move.san}`,
        );
      }
    }, 450);

    return () => {
      if (aiTaskRef.current) {
        clearTimeout(aiTaskRef.current);
        aiTaskRef.current = null;
      }
      aiTaskVersionRef.current += 1;
    };
  }, [
    aiColor,
    aiDifficulty,
    clock.isPaused,
    clock.timedOutColor,
    engineInteractionBlocked,
    gameMode,
    gameSession,
    outcome,
    snapshot.fen,
  ]);

  useEffect(
    () => () => {
      aiTaskVersionRef.current += 1;
      if (aiTaskRef.current) {
        clearTimeout(aiTaskRef.current);
      }
      void chessEngine.stop();
    },
    [],
  );

  const handleSquarePress = (square: Square) => {
    if (outcome || snapshot.status.isGameOver) {
      setFeedback('本局已经结束，请重新开始或回顾棋局');
      return;
    }

    if (
      gameMode === 'ai' &&
      (snapshot.status.turn === aiColor || aiThinking)
    ) {
      setFeedback('请等待 AI 完成走棋');
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
    if (gameMode === 'ai') {
      if (color === aiColor) {
        setFeedback('AI 一侧不能操作悔棋');
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

      if (
        aiColor === 'w' &&
        snapshot.moveCount === 1 &&
        snapshot.status.turn === 'b'
      ) {
        setFeedback('真人尚未走棋，不能撤回 AI 的第一步');
        return;
      }

      cancelAiTask();
      const undoCount = snapshot.status.turn === aiColor ? 1 : 2;
      let nextSnapshot = snapshot;
      let previousClock: ClockState | undefined;

      for (
        let index = 0;
        index < undoCount && nextSnapshot.canUndo;
        index += 1
      ) {
        previousClock = clockHistoryRef.current.pop() ?? previousClock;
        nextSnapshot = gameRef.current.undo();
      }

      let nextClock = clockRef.current;
      if (previousClock) {
        nextClock = restoreClock(previousClock, Date.now());
        applyClockState(nextClock);
      }

      setSnapshot(nextSnapshot);
      setOutcome(null);
      setResultVisible(false);
      completedRecordRef.current = null;
      clearSelection();
      setFeedback(
        undoCount === 1
          ? '已撤回真人刚才的一步'
          : '已撤回 AI 回应和真人上一步',
      );
      return;
    }

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
    let nextClock = clockRef.current;

    if (previousClock) {
      nextClock = restoreClock(previousClock, Date.now());
      applyClockState(nextClock);
    }

    setSnapshot(nextSnapshot);
    setOutcome(null);
    setResultVisible(false);
    clearSelection();
    setFeedback(`${COLOR_NAMES[color]}已撤回上一步`);
    if (activeSeries) {
      persistSeriesProgress(activeSeries, nextClock);
    }
  };

  const startNewGame = (
    config = clockConfig,
    initialFen: string | null = currentInitialFenRef.current ?? null,
    players?: { black: UserProfile; white: UserProfile },
  ) => {
    cancelAiTask();
    const nextClock = createClockState(config, Date.now());
    const normalizedFen = initialFen ?? undefined;

    gameRef.current = new ChessGame(normalizedFen);
    currentInitialFenRef.current = normalizedFen;
    setSnapshot(gameRef.current.getSnapshot());
    gameStartedAtRef.current = new Date();
    currentRecordIdRef.current = null;
    completedRecordRef.current = null;
    setClockConfig(config);
    applyClockState(nextClock);
    clockHistoryRef.current = [];
    setFlipped(false);
    setOutcome(null);
    setResultVisible(false);
    setReviewRecord(null);
    setLibraryVisible(false);
    clearSelection();
    if (players) {
      applyPlayers(players.white, players.black);
    }
    setFeedback(
      config.initialTimeMs === null
        ? '新对局已开始'
        : '新对局已准备，请点击“开始棋钟”',
    );
  };

  const startStandardGame = (
    players?: { black: UserProfile; white: UserProfile },
  ) => {
    setActiveSeries(null);
    setGameMode('local');
    setAiColor(null);
    setHumanPlayer(null);
    startNewGame(clockConfig, null, players);
  };

  const startAiGame = (
    human: UserProfile,
    difficulty: AiDifficulty,
    colorChoice: HumanColorChoice,
    config = clockConfig,
  ) => {
    const humanColor = chooseHumanColor(colorChoice);
    const nextAiColor = getOpponent(humanColor);

    setActiveSeries(null);
    setGameMode('ai');
    setAiDifficulty(difficulty);
    setHumanColorChoice(colorChoice);
    setHumanPlayer(human);
    setAiColor(nextAiColor);
    setWhitePlayer(humanColor === 'w' ? human : null);
    setBlackPlayer(humanColor === 'b' ? human : null);
    setPendingHumanId(human.id);
    startNewGame(config, null);
    setFlipped(humanColor === 'b');
    setFeedback(
      config.initialTimeMs === null
        ? `人机对局已开始，${human.name}执${humanColor === 'w' ? '白' : '黑'}`
        : `人机对局已准备，${human.name}执${humanColor === 'w' ? '白' : '黑'}，请点击“开始棋钟”`,
    );
  };

  const restartCurrentGame = (config = clockConfig) => {
    if (gameMode === 'ai' && humanPlayer) {
      startAiGame(
        humanPlayer,
        aiDifficulty,
        humanColorChoice,
        config,
      );
      return;
    }

    startNewGame(config);
  };

  const startSeriesCurrentGame = (series: SeriesRecord) => {
    const current = series.currentGame;

    if (!current) {
      setSeriesDetail(series);
      return;
    }

    const white = getProfileFromSeries(series, current.whiteProfileId);
    const black = getProfileFromSeries(series, current.blackProfileId);
    const preparedSeries: SeriesRecord = {
      ...series,
      currentGame: {
        ...current,
        clockState: undefined,
        pgn: undefined,
        startedAt: new Date().toISOString(),
      },
    };

    setActiveSeries(preparedSeries);
    setGameMode('local');
    setAiColor(null);
    setHumanPlayer(null);
    saveSeriesRecord(preparedSeries).catch(() => {
      setFeedback('本局已开始，但系列赛断点保存失败');
    });
    startNewGame(current.clockConfig, null, { black, white });
    gameStartedAtRef.current = new Date(
      preparedSeries.currentGame?.startedAt ?? current.startedAt,
    );
    setFeedback(
      `${getSeriesStageLabel(current.stage)}第 ${current.stageGameNumber} 局：${white.name}执白`,
    );
  };

  const refreshProfiles = async () => {
    try {
      const loaded = await loadUserProfiles();
      setProfiles(loaded);

      if (activeSeries) {
        setProfilesVisible(false);
        setFeedback('档案列表已更新；当前系列赛保留开赛时的双方信息');
        return;
      }

      if (loaded.length === 0) {
        setProfilesVisible(true);
        setFeedback('开始对局前必须先创建本地档案');
        return;
      }

      if (loaded.length === 1) {
        setWhitePlayer(loaded[0]);
        setBlackPlayer(null);
        setHumanPlayer(loaded[0]);
        setPendingHumanId(loaded[0].id);
        setProfilesVisible(false);
        setPlayerSetupVisible(true);
        setFeedback('一个档案可以开始人机对局；本地双人需要两个档案');
        return;
      }

      const nextWhite =
        loaded.find((profile) => profile.id === whitePlayer?.id) ??
        loaded[0];
      const nextBlack =
        loaded.find(
          (profile) =>
            profile.id === blackPlayer?.id &&
            profile.id !== nextWhite.id,
        ) ??
        loaded.find((profile) => profile.id !== nextWhite.id) ??
        loaded[1];

      applyPlayers(nextWhite, nextBlack);
      setProfilesVisible(false);
    } catch {
      setFeedback('重新读取本地档案失败');
    }
  };

  const applyPlayerSetup = () => {
    const apply = () => {
      setPlayerSetupVisible(false);

      if (pendingGameMode === 'ai') {
        const human = profiles.find(
          (profile) => profile.id === pendingHumanId,
        );

        if (!human) {
          setFeedback('请选择一个真人档案');
          return;
        }

        startAiGame(
          human,
          pendingAiDifficulty,
          pendingHumanColorChoice,
        );
        return;
      }

      const white = profiles.find(
        (profile) => profile.id === pendingWhiteId,
      );
      const black = profiles.find(
        (profile) => profile.id === pendingBlackId,
      );

      if (!white || !black || white.id === black.id) {
        setFeedback('本地双人需要选择两个不同档案');
        return;
      }

      startStandardGame({ black, white });
    };

    if (snapshot.moveCount === 0 && !outcome) {
      apply();
      return;
    }

    Alert.alert(
      '切换模式并开始新对局？',
      '当前棋局不会继续，新棋局会使用刚才选择的模式和参与者。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: apply, style: 'destructive', text: '开始新对局' },
      ],
    );
  };

  const openPlayerSetup = () => {
    if (activeSeries) {
      return;
    }

    if (profiles.length === 0) {
      setProfilesVisible(true);
      setFeedback('请先创建至少一个本地档案');
      return;
    }

    const localSelection = selectDistinctPlayerProfiles(
      profiles,
      whitePlayer?.id,
      blackPlayer?.id,
    );

    setPendingGameMode(gameMode);
    setPendingWhiteId(localSelection.whiteId);
    setPendingBlackId(localSelection.blackId);
    setPendingHumanId(humanPlayer?.id ?? profiles[0]?.id ?? null);
    setPendingAiDifficulty(aiDifficulty);
    setPendingHumanColorChoice(humanColorChoice);
    setPlayerSetupVisible(true);
  };

  const handleReset = () => {
    if (!snapshot.canUndo && !outcome) {
      restartCurrentGame();
      return;
    }

    Alert.alert('重新开始？', '当前对局和棋钟会被清除。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: () => restartCurrentGame(),
        style: 'destructive',
        text: '重新开始',
      },
    ]);
  };

  const handleApplyClockConfig = (config: ClockConfig) => {
    const apply = () => {
      setClockSettingsVisible(false);
      restartCurrentGame(config);
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
      const nextClock = resumeClock(clock, now);
      applyClockState(nextClock);
      setFeedback(
        snapshot.moveCount === 0 ? '棋钟已开始' : '棋钟继续计时',
      );
    } else {
      cancelAiTask();
      const nextClock = pauseClock(clock, now);
      applyClockState(nextClock);
      clearSelection();
      setFeedback('棋钟已暂停');
      if (activeSeries) {
        persistSeriesProgress(activeSeries, nextClock);
      }
    }
  };

  const handleResign = (color: Color) => {
    if (outcome) {
      return;
    }

    if (gameMode === 'ai' && color === aiColor) {
      setFeedback('AI 不会主动认输');
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

  if (!profilesReady) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>正在读取本地档案…</Text>
      </View>
    );
  }

  if (profilesVisible) {
    return <UserProfilesScreen onBack={refreshProfiles} />;
  }

  if (positionEditorVisible) {
    return (
      <PositionEditorScreen
        onBack={() => setPositionEditorVisible(false)}
        onStart={(fen) => {
          setPositionEditorVisible(false);
          setActiveSeries(null);
          startNewGame(clockConfig, fen);
          setFeedback('已从自定义局面开始本地对局');
        }}
      />
    );
  }

  if (seriesSetupVisible) {
    return (
      <SeriesSetupScreen
        onBack={() => setSeriesSetupVisible(false)}
        onStart={(series) => {
          setSeriesSetupVisible(false);
          startSeriesCurrentGame(series);
        }}
      />
    );
  }

  if (reviewRecord) {
    return (
      <ReviewScreen
        onBack={() => {
          setReviewRecord(null);
          setLibraryVisible(reviewReturn === 'library');
        }}
        onRestart={() => restartCurrentGame()}
        record={reviewRecord}
      />
    );
  }

  if (seriesDetail) {
    return (
      <SeriesDetailScreen
        onBack={() => {
          setSeriesDetail(null);
          setLibraryVisible(true);
        }}
        onOpenGame={(record) => {
          setReviewReturn('series');
          setReviewRecord(record);
        }}
        onResume={
          seriesDetail.status === 'active'
            ? (series) => resumeSeries(series)
            : undefined
        }
        series={seriesDetail}
      />
    );
  }

  if (libraryVisible) {
    return (
      <GameLibraryScreen
        canSaveCurrent={snapshot.moveCount > 0 && !activeSeries}
        onBack={() => setLibraryVisible(false)}
        onBuildCurrentRecord={buildCurrentRecord}
        onOpenRecord={(record) => {
          setReviewReturn('library');
          setLibraryVisible(false);
          setReviewRecord(record);
        }}
        onOpenSeries={(series) => {
          setLibraryVisible(false);
          setSeriesDetail(series);
        }}
      />
    );
  }

  if (learnVisible) {
    return <LearnScreen onBack={() => setLearnVisible(false)} />;
  }

  const undoBlockedByOutcome =
    outcome?.reason === 'resignation' || outcome?.reason === 'timeout';
  const humanUndoDisabled =
    !snapshot.canUndo ||
    undoBlockedByOutcome ||
    (aiColor === 'w' &&
      snapshot.moveCount === 1 &&
      snapshot.status.turn === 'b');
  const whiteParticipant = getParticipant('w');
  const blackParticipant = getParticipant('b');
  const topPanelColor: Color =
    gameMode === 'ai' && aiColor ? aiColor : 'b';
  const bottomPanelColor = getOpponent(topPanelColor);
  const renderPlayerPanel = (color: Color, facingAway = false) => {
    const participant =
      color === 'w' ? whiteParticipant : blackParticipant;
    const isAiSide = gameMode === 'ai' && aiColor === color;

    return (
      <PlayerClockPanel
        color={color}
        disabledResign={Boolean(outcome) || isAiSide}
        disabledUndo={
          gameMode === 'ai'
            ? isAiSide || humanUndoDisabled
            : !snapshot.canUndo ||
              snapshot.status.turn !== color ||
              undoBlockedByOutcome
        }
        facingAway={facingAway && gameMode === 'local'}
        isActive={snapshot.status.turn === color && !outcome}
        isPaused={clockPaused}
        onResign={() => handleResign(color)}
        onUndo={() => handleUndo(color)}
        playerName={participant.name}
        statusLabel={
          isAiSide
            ? aiThinking
              ? 'AI 正在思考'
              : 'AI 对手'
            : undefined
        }
        timeMs={color === 'w' ? clock.whiteTimeMs : clock.blackTimeMs}
        timedOut={clock.timedOutColor === color}
      />
    );
  };
  const subtitle = activeSeries
    ? `${getSeriesResultLabel(activeSeries)} · 已走 ${snapshot.moveCount} 步`
    : `${whiteParticipant.name} vs ${
        blackParticipant.name
      } · ${getClockConfigLabel(clockConfig)} · 已走 ${
        snapshot.moveCount
      } 步`;

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { minHeight: height }]}
        style={styles.gameScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="打开左侧工具栏"
            accessibilityRole="button"
            onPress={() => setDrawerVisible(true)}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={styles.menuButtonIcon}>☰</Text>
            <Text style={styles.menuButtonText}>工具</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Free Chess</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {renderPlayerPanel(topPanelColor, true)}

        <View style={styles.boardWrap}>
          <ChessBoard
            board={snapshot.board}
            faceToFacePieces={gameMode === 'local'}
            flipped={flipped}
            lastMove={snapshot.lastMove}
            legalMoves={legalMoves}
            onSquarePress={handleSquarePress}
            selectedSquare={selectedSquare}
            size={boardSize}
          />
        </View>

        {renderPlayerPanel(bottomPanelColor)}

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

      <View style={styles.bottomNavigation}>
        <BottomNavigationItem active label="对局" onPress={() => {}} />
        <BottomNavigationItem
          label="学习"
          onPress={() => setLearnVisible(true)}
        />
        <BottomNavigationItem
          label="棋谱"
          onPress={() => setLibraryVisible(true)}
        />
        <BottomNavigationItem
          disabled={Boolean(activeSeries)}
          label="模式"
          onPress={openPlayerSetup}
        />
        <BottomNavigationItem
          label="我的"
          onPress={() => setProfilesVisible(true)}
        />
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}
        transparent
        visible={drawerVisible}
      >
        <View style={styles.drawerBackdrop}>
          <View accessibilityViewIsModal style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerEyebrow}>FREE CHESS</Text>
                <Text style={styles.drawerTitle}>对局工具</Text>
              </View>
              <Pressable
                accessibilityLabel="关闭左侧工具栏"
                onPress={() => setDrawerVisible(false)}
                style={styles.drawerClose}
              >
                <Text style={styles.drawerCloseText}>关闭</Text>
              </Pressable>
            </View>
            <Text style={styles.drawerDescription}>
              这些功能与当前棋盘相关，使用后仍可返回本局。
            </Text>
            <DrawerItem
              disabled={Boolean(activeSeries) || gameMode === 'ai'}
              detail={
                gameMode === 'ai'
                  ? '人机模式不支持自由局面，请先切回本地双人'
                  : '摆放棋子、导入 FEN 或从指定局面开局'
              }
              label="自由局面"
              onPress={() => {
                setDrawerVisible(false);
                setPositionEditorVisible(true);
              }}
            />
            <DrawerItem
              disabled={gameMode === 'ai'}
              detail={
                gameMode === 'ai'
                  ? '人机模式不支持系列赛，请先切回本地双人'
                  : activeSeries
                  ? '查看当前比分、局次和中断续赛状态'
                  : '创建 BO2 至 BO6 本地系列赛'
              }
              label={activeSeries ? '当前赛况' : '系列赛'}
              onPress={() => {
                setDrawerVisible(false);

                if (activeSeries) {
                  setSeriesDetail(activeSeries);
                } else {
                  setSeriesSetupVisible(true);
                }
              }}
            />
            <DrawerItem
              disabled={Boolean(activeSeries)}
              detail="选择无棋钟、固定时间或自定义时间"
              label="棋钟设置"
              onPress={() => {
                setDrawerVisible(false);
                setClockSettingsVisible(true);
              }}
            />
            <DrawerItem
              detail="创建、改名或删除本机玩家档案"
              label="档案管理"
              onPress={() => {
                setDrawerVisible(false);
                setProfilesVisible(true);
              }}
            />
            <DrawerItem
              detail={`${appTheme.label} · ${boardSkin.label} · ${pieceSkin.label}`}
              label="外观设置"
              onPress={() => {
                setDrawerVisible(false);
                setAppearanceVisible(true);
              }}
            />
            {activeSeries || gameMode === 'ai' ? (
              <Text style={styles.drawerNote}>
                {activeSeries
                  ? '系列赛进行中时，模式、自由局面和棋钟设置保持锁定，避免改变比赛规则。'
                  : '人机模式下自由局面和系列赛不可用，切回本地双人后即可使用。'}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="关闭左侧工具栏"
            onPress={() => setDrawerVisible(false)}
            style={styles.drawerDismiss}
          />
        </View>
      </Modal>

      <ClockSettingsModal
        config={clockConfig}
        onApply={handleApplyClockConfig}
        onClose={() => setClockSettingsVisible(false)}
        visible={clockSettingsVisible}
      />

      <AppearanceSettingsModal
        appThemeId={settings.appThemeId}
        boardSkinId={settings.boardSkinId}
        onApplyAppTheme={setAppThemeId}
        onApplyBoardSkin={setBoardSkinId}
        onApplyPieceSkin={setPieceSkinId}
        onClose={() => setAppearanceVisible(false)}
        pieceSkinId={settings.pieceSkinId}
        visible={appearanceVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => setPlayerSetupVisible(false)}
        transparent
        visible={playerSetupVisible}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.dialogTitle}>选择对局模式</Text>
            <ScrollView style={styles.profileChooserScroll}>
              <Text style={styles.playerSideLabel}>模式</Text>
              <View style={styles.profileChoiceGrid}>
                <ProfileChoice
                  disabled={profiles.length < 2}
                  label="本地双人"
                  onPress={() => setPendingGameMode('local')}
                  selected={pendingGameMode === 'local'}
                />
                <ProfileChoice
                  disabled={profiles.length < 1}
                  label="人机对局"
                  onPress={() => setPendingGameMode('ai')}
                  selected={pendingGameMode === 'ai'}
                />
              </View>

              {pendingGameMode === 'local' ? (
                <>
                  <Text style={styles.playerSideLabel}>白方</Text>
                  <View style={styles.profileChoiceGrid}>
                    {profiles.map((profile) => (
                      <ProfileChoice
                        disabled={profile.id === pendingBlackId}
                        key={`white-${profile.id}`}
                        label={profile.name}
                        onPress={() => setPendingWhiteId(profile.id)}
                        selected={profile.id === pendingWhiteId}
                      />
                    ))}
                  </View>
                  <Text style={styles.playerSideLabel}>黑方</Text>
                  <View style={styles.profileChoiceGrid}>
                    {profiles.map((profile) => (
                      <ProfileChoice
                        disabled={profile.id === pendingWhiteId}
                        key={`black-${profile.id}`}
                        label={profile.name}
                        onPress={() => setPendingBlackId(profile.id)}
                        selected={profile.id === pendingBlackId}
                      />
                    ))}
                  </View>
                  {profiles.length < 2 ? (
                    <Text style={styles.modeNote}>
                      本地双人需要两个不同档案。
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.playerSideLabel}>真人档案</Text>
                  <View style={styles.profileChoiceGrid}>
                    {profiles.map((profile) => (
                      <ProfileChoice
                        disabled={false}
                        key={`human-${profile.id}`}
                        label={profile.name}
                        onPress={() => setPendingHumanId(profile.id)}
                        selected={profile.id === pendingHumanId}
                      />
                    ))}
                  </View>
                  <Text style={styles.playerSideLabel}>AI 难度</Text>
                  <View style={styles.profileChoiceGrid}>
                    {(
                      Object.keys(
                        AI_DIFFICULTY_LABELS,
                      ) as AiDifficulty[]
                    ).map((difficulty) => (
                      <ProfileChoice
                        disabled={false}
                        key={difficulty}
                        label={AI_DIFFICULTY_LABELS[difficulty]}
                        onPress={() =>
                          setPendingAiDifficulty(difficulty)
                        }
                        selected={pendingAiDifficulty === difficulty}
                      />
                    ))}
                  </View>
                  <Text style={styles.playerSideLabel}>真人执色</Text>
                  <View style={styles.profileChoiceGrid}>
                    {(
                      Object.keys(
                        HUMAN_COLOR_LABELS,
                      ) as HumanColorChoice[]
                    ).map((choice) => (
                      <ProfileChoice
                        disabled={false}
                        key={choice}
                        label={HUMAN_COLOR_LABELS[choice]}
                        onPress={() =>
                          setPendingHumanColorChoice(choice)
                        }
                        selected={pendingHumanColorChoice === choice}
                      />
                    ))}
                  </View>
                  <Text style={styles.modeNote}>
                    AI 完全离线运行。随机颜色会在每次重新开始时重新抽取。
                  </Text>
                </>
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={applyPlayerSetup}
              style={[
                styles.primaryButton,
                ((pendingGameMode === 'local' &&
                  profiles.length < 2) ||
                  (pendingGameMode === 'ai' &&
                    profiles.length < 1)) &&
                  styles.disabledButton,
              ]}
              disabled={
                (pendingGameMode === 'local' && profiles.length < 2) ||
                (pendingGameMode === 'ai' && profiles.length < 1)
              }
            >
              <Text style={styles.primaryButtonText}>
                应用并开始新对局
              </Text>
            </Pressable>
            <View style={styles.playerDialogFooter}>
              <Pressable
                onPress={() => setPlayerSetupVisible(false)}
                style={styles.textButton}
              >
                <Text style={styles.textButtonLabel}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPlayerSetupVisible(false);
                  setProfilesVisible(true);
                }}
                style={styles.textButton}
              >
                <Text style={styles.textButtonLabel}>管理档案</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              onPress={() => {
                setResultVisible(false);

                if (activeSeries?.status === 'active') {
                  startSeriesCurrentGame(activeSeries);
                  return;
                }

                if (activeSeries?.status === 'completed') {
                  const completed = activeSeries;
                  setActiveSeries(null);
                  setSeriesDetail(completed);
                  return;
                }

                restartCurrentGame();
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {activeSeries?.status === 'active'
                  ? '开始下一局'
                  : activeSeries?.status === 'completed'
                    ? '查看系列赛结果'
                    : '重新开始'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setResultVisible(false);
                const record =
                  completedRecordRef.current ?? buildCurrentRecord();
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
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

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

type NavigationItemProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function BottomNavigationItem({
  active = false,
  disabled = false,
  label,
  onPress,
}: NavigationItemProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomNavigationItem,
        active && styles.activeBottomNavigationItem,
        disabled && styles.disabledBottomNavigationItem,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <View
        style={[
          styles.bottomNavigationMarker,
          active && styles.activeBottomNavigationMarker,
        ]}
      />
      <Text
        style={[
          styles.bottomNavigationText,
          active && styles.activeBottomNavigationText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DrawerItem({
  detail,
  disabled = false,
  label,
  onPress,
}: NavigationItemProps & { detail: string }) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        disabled && styles.disabledDrawerItem,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text
        style={[
          styles.drawerItemLabel,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.drawerItemDetail,
          disabled && styles.disabledButtonText,
        ]}
      >
        {detail}
      </Text>
    </Pressable>
  );
}

type ProfileChoiceProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
};

function ProfileChoice({
  disabled,
  label,
  onPress,
  selected,
}: ProfileChoiceProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.profileChoice,
        selected && styles.selectedProfileChoice,
        disabled && styles.disabledButton,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[
          styles.profileChoiceText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AppearanceSettingsModalProps = {
  appThemeId: ThemeId;
  boardSkinId: BoardSkinId;
  onApplyAppTheme: (id: ThemeId) => void;
  onApplyBoardSkin: (id: BoardSkinId) => void;
  onApplyPieceSkin: (id: PieceSkinId) => void;
  onClose: () => void;
  pieceSkinId: PieceSkinId;
  visible: boolean;
};

function AppearanceSettingsModal({
  appThemeId,
  boardSkinId,
  onApplyAppTheme,
  onApplyBoardSkin,
  onApplyPieceSkin,
  onClose,
  pieceSkinId,
  visible,
}: AppearanceSettingsModalProps) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.appearanceDialog}>
          <View style={styles.appearanceHeader}>
            <View style={styles.appearanceHeaderText}>
              <Text style={styles.dialogTitle}>外观设置</Text>
              <Text style={styles.dialogDescription}>
                UI 主题、棋盘和棋子会分别保存到本机。
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.drawerClose}>
              <Text style={styles.drawerCloseText}>关闭</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.appearanceContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.playerSideLabel}>全软件 UI 主题</Text>
            <View style={styles.appearanceGrid}>
              {APP_THEME_OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => onApplyAppTheme(option.id)}
                  style={[
                    styles.appearanceChoice,
                    appThemeId === option.id &&
                      styles.selectedAppearanceChoice,
                  ]}
                >
                  <View style={styles.themeSwatches}>
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: option.screen },
                      ]}
                    />
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: option.surface },
                      ]}
                    />
                    <View
                      style={[
                        styles.themeSwatch,
                        { backgroundColor: option.accent },
                      ]}
                    />
                  </View>
                  <Text style={styles.appearanceChoiceTitle}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.playerSideLabel}>棋盘皮肤</Text>
            <View style={styles.appearanceGrid}>
              {BOARD_SKIN_OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => onApplyBoardSkin(option.id)}
                  style={[
                    styles.appearanceChoice,
                    boardSkinId === option.id &&
                      styles.selectedAppearanceChoice,
                  ]}
                >
                  <BoardSkinPreview skin={option} />
                  <Text style={styles.appearanceChoiceTitle}>
                    {option.label}
                  </Text>
                  <Text numberOfLines={2} style={styles.appearanceChoiceMeta}>
                    {option.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.playerSideLabel}>棋子皮肤</Text>
            <View style={styles.appearanceGrid}>
              {PIECE_SKIN_OPTIONS.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => onApplyPieceSkin(option.id)}
                  style={[
                    styles.appearanceChoice,
                    pieceSkinId === option.id &&
                      styles.selectedAppearanceChoice,
                  ]}
                >
                  <View style={styles.piecePreviewRow}>
                    <Text
                      style={[
                        styles.piecePreview,
                        {
                          color: option.white,
                          fontFamily: option.family,
                          textShadowColor: option.whiteShadow,
                        },
                      ]}
                    >
                      ♔
                    </Text>
                    <Text
                      style={[
                        styles.piecePreview,
                        {
                          color: option.black,
                          fontFamily: option.family,
                          textShadowColor: option.blackShadow,
                        },
                      ]}
                    >
                      ♞
                    </Text>
                  </View>
                  <Text style={styles.appearanceChoiceTitle}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BoardSkinPreview({ skin }: { skin: BoardSkin }) {
  const { appTheme } = useTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const previewSquares = [
    skin.lightSquare,
    skin.darkSquare,
    skin.darkSquare,
    skin.lightSquare,
  ];

  return (
    <View style={[styles.boardSkinPreview, { borderColor: skin.border }]}>
      {previewSquares.map((color, index) => (
        <View
          key={`${skin.id}-${index}`}
          style={[
            styles.boardSkinPreviewSquare,
            { backgroundColor: color },
            index === 1 && { backgroundColor: skin.lastMove },
            index === 2 && {
              borderColor: skin.selected,
              borderWidth: 2,
            },
          ]}
        >
          {index === 3 ? (
            <View
              style={[
                styles.boardSkinPreviewDot,
                { backgroundColor: skin.moveTarget },
              ]}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: theme.screen,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.mutedText,
    fontSize: 14,
  },
  screen: {
    backgroundColor: theme.screen,
    flex: 1,
  },
  gameScroll: {
    flex: 1,
  },
  content: {
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingBottom: 18,
    paddingHorizontal: 12,
    paddingTop: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  headerText: {
    flex: 1,
    marginLeft: 11,
  },
  title: {
    color: theme.text,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.subtleText,
    fontSize: 11,
    marginTop: 1,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  menuButtonIcon: {
    color: theme.accentStrong,
    fontSize: 19,
    fontWeight: '900',
  },
  menuButtonText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  boardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statusPanel: {
    alignItems: 'center',
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 9,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  finishedStatusPanel: {
    borderColor: theme.accent,
  },
  turnMarker: {
    borderRadius: 999,
    height: 24,
    marginRight: 10,
    width: 24,
  },
  whiteTurnMarker: {
    backgroundColor: '#f6f2e6',
    borderColor: theme.subtleText,
    borderWidth: 2,
  },
  blackTurnMarker: {
    backgroundColor: '#20231f',
    borderColor: theme.mutedText,
    borderWidth: 2,
  },
  statusTextGroup: {
    flex: 1,
  },
  statusText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackText: {
    color: theme.mutedText,
    fontSize: 11,
    marginTop: 2,
  },
  globalControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  bottomNavigation: {
    backgroundColor: theme.navigation,
    borderColor: theme.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 66,
    paddingBottom: 5,
    paddingHorizontal: 8,
  },
  bottomNavigationItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  activeBottomNavigationItem: {
    backgroundColor: theme.navigationActive,
  },
  disabledBottomNavigationItem: {
    opacity: 0.4,
  },
  bottomNavigationMarker: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 3,
    marginBottom: 7,
    width: 24,
  },
  activeBottomNavigationMarker: {
    backgroundColor: theme.accentStrong,
  },
  bottomNavigationText: {
    color: theme.subtleText,
    fontSize: 11,
    fontWeight: '800',
  },
  activeBottomNavigationText: {
    color: theme.text,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: theme.elevated,
    borderColor: theme.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  controlButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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
  drawerBackdrop: {
    backgroundColor: theme.backdrop,
    flex: 1,
    flexDirection: 'row',
  },
  drawerPanel: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRightWidth: 1,
    maxWidth: 360,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 48,
    width: '84%',
  },
  drawerDismiss: {
    flex: 1,
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawerEyebrow: {
    color: theme.accentStrong,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  drawerTitle: {
    color: theme.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  drawerClose: {
    backgroundColor: theme.elevated,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  drawerCloseText: {
    color: theme.mutedText,
    fontSize: 11,
    fontWeight: '800',
  },
  drawerDescription: {
    color: theme.subtleText,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    marginTop: 9,
  },
  drawerItem: {
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderRadius: 11,
    borderWidth: 1,
    marginBottom: 9,
    minHeight: 70,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  disabledDrawerItem: {
    backgroundColor: theme.disabledBg,
    borderColor: theme.disabledBorder,
  },
  drawerItemLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },
  drawerItemDetail: {
    color: theme.subtleText,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  drawerNote: {
    color: theme.warning,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: theme.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  dialogTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  dialogDescription: {
    color: theme.mutedText,
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
    backgroundColor: theme.elevated,
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  promotionSymbol: {
    color: theme.text,
    fontFamily: 'serif',
    fontSize: 36,
  },
  promotionLabel: {
    color: theme.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  resultEyebrow: {
    color: theme.accentStrong,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
  },
  resultTitle: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 7,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: theme.accent,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: theme.onAccent,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 9,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textButton: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 9,
  },
  textButtonLabel: {
    color: theme.accentStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  playerSideLabel: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 16,
  },
  profileChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  profileChooserScroll: {
    maxHeight: 360,
  },
  profileChoice: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '47%',
    paddingHorizontal: 9,
    paddingVertical: 9,
  },
  selectedProfileChoice: {
    backgroundColor: theme.accentMuted,
    borderColor: theme.accentStrong,
  },
  profileChoiceText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeNote: {
    color: theme.mutedText,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },
  playerDialogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  appearanceDialog: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '86%',
    maxWidth: 520,
    padding: 18,
    width: '100%',
  },
  appearanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  appearanceHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  appearanceContent: {
    paddingBottom: 8,
  },
  appearanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  appearanceChoice: {
    backgroundColor: theme.panel,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 86,
    padding: 10,
    width: '48%',
  },
  selectedAppearanceChoice: {
    backgroundColor: theme.navigationActive,
    borderColor: theme.accentStrong,
  },
  appearanceChoiceTitle: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 7,
  },
  appearanceChoiceMeta: {
    color: theme.subtleText,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  themeSwatches: {
    flexDirection: 'row',
    gap: 5,
  },
  themeSwatch: {
    borderColor: theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    width: 24,
  },
  boardSkinPreview: {
    borderRadius: 7,
    borderWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 46,
    overflow: 'hidden',
    width: 46,
  },
  boardSkinPreviewSquare: {
    alignItems: 'center',
    height: 21,
    justifyContent: 'center',
    width: 21,
  },
  boardSkinPreviewDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  piecePreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  piecePreview: {
    fontSize: 31,
    lineHeight: 36,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 2,
  },
  });
}
