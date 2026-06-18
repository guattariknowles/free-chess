import type { Color } from 'chess.js';

import type {
  ChessLesson,
  InteractiveLesson,
  InteractiveLessonMove,
  InteractiveLessonOpponent,
  InteractiveLessonStep,
} from '../data/lessons/lessonCatalog';
import type { EngineSearchOptions } from '../engine/ChessEngine';
import { ChessGame, type LegalMove } from './chessState';

export type LessonFeedback = {
  kind: 'complete' | 'correct' | 'error' | 'hint' | 'info';
  message: string;
};

type LessonRuntimeCheckpoint = {
  awaitingAdvance: boolean;
  awaitingOpponent: boolean;
  completed: boolean;
  errors: number;
  feedback: LessonFeedback;
  fen: string;
  freePlay: boolean;
  moves: LegalMove[];
  opponentContext: LessonOpponentContext | null;
  stepIndex: number;
  turn: Color;
};

export type LessonRuntimeState = LessonRuntimeCheckpoint & {
  history: LessonRuntimeCheckpoint[];
  lessonId: string;
};

export type LessonMoveInput = InteractiveLessonMove;
export type LessonOpponentContext = 'free-play' | 'initial' | 'step';

function getInteractiveLesson(lesson: ChessLesson): InteractiveLesson {
  if (!lesson.interactive) {
    throw new Error(`${lesson.id}: 课程没有互动练习`);
  }

  return lesson.interactive;
}

function checkpointState(
  state: LessonRuntimeState,
): LessonRuntimeCheckpoint {
  return {
    awaitingAdvance: state.awaitingAdvance,
    awaitingOpponent: state.awaitingOpponent,
    completed: state.completed,
    errors: state.errors,
    feedback: state.feedback,
    fen: state.fen,
    freePlay: state.freePlay,
    moves: [...state.moves],
    opponentContext: state.opponentContext,
    stepIndex: state.stepIndex,
    turn: state.turn,
  };
}

function movesMatch(
  expected: InteractiveLessonMove,
  actual: InteractiveLessonMove,
): boolean {
  return (
    expected.from === actual.from &&
    expected.to === actual.to &&
    (expected.promotion === undefined ||
      expected.promotion === actual.promotion)
  );
}

function applyMove(
  game: ChessGame,
  move: InteractiveLessonMove,
): LegalMove {
  const result = game.move(move.from, move.to, move.promotion);

  if (!result.success) {
    throw new Error(`课程走法不合法：${move.from}-${move.to}`);
  }

  return result.move;
}

function getScriptedOpponentMove(
  opponent: InteractiveLessonOpponent,
  contextId: string,
  fen: string,
): LegalMove | null {
  if (opponent.mode !== 'scripted') {
    return null;
  }

  if (!opponent.allowedMoves?.[0]) {
    throw new Error(`${contextId}: 固定回应缺少走法`);
  }

  const game = new ChessGame(fen, {
    allowMovesAfterGameOver: true,
  });
  return applyMove(game, opponent.allowedMoves[0]);
}

function finishGuidedStep(
  interactive: InteractiveLesson,
  state: LessonRuntimeState,
  step: InteractiveLessonStep,
  game: ChessGame,
  appliedOpponentMove: LegalMove | null,
  fallbackReason?: string,
): LessonRuntimeState {
  let snapshot = game.getSnapshot();
  const isFinalStep = state.stepIndex === interactive.steps.length - 1;
  const startsFreePlay = isFinalStep && interactive.freePlay !== undefined;
  const responseText = appliedOpponentMove
    ? ` 对手回应 ${appliedOpponentMove.san}。`
    : '';
  const transitionText = step.transition
    ? ` ${step.transition.message}`
    : '';
  const fallbackText = fallbackReason
    ? ' Stockfish 暂不可用，本步已使用简易 AI。'
    : '';

  if (step.transition) {
    snapshot = new ChessGame(step.transition.fen, {
      allowMovesAfterGameOver: true,
    }).getSnapshot();
  }

  return {
    ...state,
    awaitingAdvance: !isFinalStep,
    awaitingOpponent: false,
    completed: isFinalStep && !startsFreePlay,
    feedback: {
      kind: isFinalStep && !startsFreePlay ? 'complete' : 'correct',
      message: `${step.explanation}${responseText}${transitionText}${fallbackText}${
        isFinalStep
          ? startsFreePlay
            ? ' 导入的开局训练已完成，现在由 AI 自主回应，继续把棋下完。'
            : ` ${interactive.completion}`
          : ''
      }`,
    },
    fen: snapshot.fen,
    freePlay: startsFreePlay,
    moves: [
      ...state.moves,
      ...(appliedOpponentMove ? [appliedOpponentMove] : []),
    ],
    opponentContext: null,
    turn: snapshot.status.turn,
  };
}

export function createLessonRuntime(
  lesson: ChessLesson,
): LessonRuntimeState {
  const interactive = getInteractiveLesson(lesson);
  const game = new ChessGame(interactive.startFen, {
    allowMovesAfterGameOver: true,
  });
  const initialMove =
    interactive.initialOpponent?.mode === 'scripted'
      ? getScriptedOpponentMove(
          interactive.initialOpponent,
          'initial-opponent',
          interactive.startFen,
        )
      : null;
  const appliedInitialMove = initialMove
    ? applyMove(game, initialMove)
    : null;
  const awaitingInitialOpponent =
    interactive.initialOpponent?.mode === 'local-ai';
  const snapshot = game.getSnapshot();
  const freePlay =
    interactive.steps.length === 0 && interactive.freePlay !== undefined;

  return {
    awaitingAdvance: false,
    awaitingOpponent: awaitingInitialOpponent,
    completed: false,
    errors: 0,
    feedback: {
      kind: 'info',
      message: `${interactive.intro}${
        appliedInitialMove
          ? ` AI 先走 ${appliedInitialMove.san}，现在轮到你。`
          : awaitingInitialOpponent
            ? ' AI 正在准备第一步。'
          : ''
      }`,
    },
    fen: snapshot.fen,
    freePlay,
    history: [],
    lessonId: lesson.id,
    moves: appliedInitialMove ? [appliedInitialMove] : [],
    opponentContext: awaitingInitialOpponent ? 'initial' : null,
    stepIndex: 0,
    turn: snapshot.status.turn,
  };
}

export function getPendingLessonEngineOptions(
  lesson: ChessLesson,
  state: LessonRuntimeState,
): EngineSearchOptions | null {
  if (!state.awaitingOpponent || !state.opponentContext) {
    return null;
  }

  const interactive = getInteractiveLesson(lesson);

  if (state.opponentContext === 'free-play') {
    return interactive.freePlay
      ? { difficulty: interactive.freePlay.difficulty }
      : null;
  }

  const opponent: InteractiveLessonOpponent | undefined =
    state.opponentContext === 'initial'
      ? interactive.initialOpponent
      : interactive.steps[state.stepIndex]?.opponent;

  if (!opponent || opponent.mode !== 'local-ai') {
    return null;
  }

  return {
    allowedMoves: opponent.allowedMoves,
    difficulty: opponent.difficulty,
  };
}

export function getCurrentLessonStep(
  lesson: ChessLesson,
  state: LessonRuntimeState,
): InteractiveLessonStep | null {
  return getInteractiveLesson(lesson).steps[state.stepIndex] ?? null;
}

export function attemptLessonMove(
  lesson: ChessLesson,
  state: LessonRuntimeState,
  input: LessonMoveInput,
  _random: () => number = Math.random,
): LessonRuntimeState {
  if (
    state.completed ||
    state.awaitingAdvance ||
    state.awaitingOpponent
  ) {
    return state;
  }

  const interactive = getInteractiveLesson(lesson);

  if (state.freePlay) {
    const game = new ChessGame(state.fen, {
      allowMovesAfterGameOver: true,
    });
    const legalMove = game
      .getLegalMoves(input.from)
      .find((move) => movesMatch(move, input));

    if (!legalMove) {
      return {
        ...state,
        errors: state.errors + 1,
        feedback: {
          kind: 'error',
          message: '这步不符合棋规，请重新选择。',
        },
      };
    }

    const history = [...state.history, checkpointState(state)];
    const userMove = applyMove(game, input);
    const snapshot = game.getSnapshot();
    const completed = snapshot.status.isGameOver;

    return {
      ...state,
      awaitingOpponent: !completed,
      completed,
      feedback: {
        kind: completed ? 'complete' : 'info',
        message: completed
          ? `${snapshot.status.message} ${interactive.completion}`
          : `你走了 ${userMove.san}。AI 正在思考。`,
      },
      fen: snapshot.fen,
      history,
      moves: [...state.moves, userMove],
      opponentContext: completed ? null : 'free-play',
      turn: snapshot.status.turn,
    };
  }

  const step = interactive.steps[state.stepIndex];

  if (!step) {
    return state;
  }

  const game = new ChessGame(state.fen, {
    allowMovesAfterGameOver: true,
  });
  const legalMove = game
    .getLegalMoves(input.from)
    .find((move) => movesMatch(move, input));

  if (!legalMove) {
    return {
      ...state,
      errors: state.errors + 1,
      feedback: {
        kind: 'error',
        message: `这步不符合棋规。${step.incorrectFeedback}`,
      },
    };
  }

  if (!step.acceptedMoves.some((move) => movesMatch(move, input))) {
    return {
      ...state,
      errors: state.errors + 1,
      feedback: {
        kind: 'error',
        message: step.incorrectFeedback,
      },
    };
  }

  const history = [...state.history, checkpointState(state)];
  const userMove = applyMove(game, input);
  const snapshot = game.getSnapshot();
  const afterUserMove: LessonRuntimeState = {
    ...state,
    awaitingOpponent: step.opponent?.mode === 'local-ai',
    feedback: step.opponent?.mode === 'local-ai'
      ? {
          kind: 'info',
          message: `你走了 ${userMove.san}。AI 正在思考。`,
        }
      : state.feedback,
    fen: snapshot.fen,
    history,
    moves: [...state.moves, userMove],
    opponentContext:
      step.opponent?.mode === 'local-ai' ? 'step' : null,
    turn: snapshot.status.turn,
  };

  if (step.opponent?.mode === 'local-ai') {
    return afterUserMove;
  }

  const opponentMove = step.opponent
    ? getScriptedOpponentMove(
        step.opponent,
        `${lesson.id}/${step.id}`,
        snapshot.fen,
      )
    : null;
  const appliedOpponentMove = opponentMove
    ? applyMove(game, opponentMove)
    : null;

  return finishGuidedStep(
    interactive,
    afterUserMove,
    step,
    game,
    appliedOpponentMove,
  );
}

export function applyLessonOpponentMove(
  lesson: ChessLesson,
  state: LessonRuntimeState,
  move: InteractiveLessonMove | null,
  fallbackReason?: string,
): LessonRuntimeState {
  if (!state.awaitingOpponent || !state.opponentContext) {
    return state;
  }

  if (!move) {
    return {
      ...state,
      awaitingOpponent: false,
      feedback: {
        kind: 'error',
        message: 'AI 没有返回可用走法，请撤回上一步或重新开始。',
      },
      opponentContext: null,
    };
  }

  const interactive = getInteractiveLesson(lesson);
  const game = new ChessGame(state.fen, {
    allowMovesAfterGameOver: true,
  });
  let appliedOpponentMove: LegalMove;

  try {
    appliedOpponentMove = applyMove(game, move);
  } catch {
    return {
      ...state,
      awaitingOpponent: false,
      feedback: {
        kind: 'error',
        message: 'AI 返回了不合法走法，请撤回上一步或重新开始。',
      },
      opponentContext: null,
    };
  }

  if (state.opponentContext === 'initial') {
    const snapshot = game.getSnapshot();
    return {
      ...state,
      awaitingOpponent: false,
      feedback: {
        kind: 'info',
        message: `${interactive.intro} AI 先走 ${appliedOpponentMove.san}，现在轮到你。${
          fallbackReason
            ? ' Stockfish 暂不可用，本步已使用简易 AI。'
            : ''
        }`,
      },
      fen: snapshot.fen,
      moves: [...state.moves, appliedOpponentMove],
      opponentContext: null,
      turn: snapshot.status.turn,
    };
  }

  if (state.opponentContext === 'free-play') {
    const snapshot = game.getSnapshot();
    const completed = snapshot.status.isGameOver;
    return {
      ...state,
      awaitingOpponent: false,
      completed,
      feedback: {
        kind: completed ? 'complete' : 'correct',
        message: completed
          ? `${snapshot.status.message} ${interactive.completion}`
          : `AI 回应 ${appliedOpponentMove.san}。继续自由对弈。${
              fallbackReason
                ? ' Stockfish 暂不可用，本步已使用简易 AI。'
                : ''
            }`,
      },
      fen: snapshot.fen,
      moves: [...state.moves, appliedOpponentMove],
      opponentContext: null,
      turn: snapshot.status.turn,
    };
  }

  const step = interactive.steps[state.stepIndex];

  if (!step) {
    return {
      ...state,
      awaitingOpponent: false,
      opponentContext: null,
    };
  }

  return finishGuidedStep(
    interactive,
    state,
    step,
    game,
    appliedOpponentMove,
    fallbackReason,
  );
}

export function advanceLesson(
  lesson: ChessLesson,
  state: LessonRuntimeState,
): LessonRuntimeState {
  if (
    !state.awaitingAdvance ||
    state.completed ||
    state.awaitingOpponent
  ) {
    return state;
  }

  const interactive = getInteractiveLesson(lesson);
  const nextStepIndex = state.stepIndex + 1;
  const nextStep = interactive.steps[nextStepIndex];

  if (!nextStep) {
    return {
      ...state,
      awaitingAdvance: false,
      completed: true,
      feedback: {
        kind: 'complete',
        message: interactive.completion,
      },
    };
  }

  return {
    ...state,
    awaitingAdvance: false,
    feedback: {
      kind: 'info',
      message: nextStep.instruction,
    },
    stepIndex: nextStepIndex,
  };
}

export function showLessonHint(
  lesson: ChessLesson,
  state: LessonRuntimeState,
): LessonRuntimeState {
  if (state.completed || state.awaitingOpponent) {
    return state;
  }

  const step = getCurrentLessonStep(lesson, state);

  return step
    ? {
        ...state,
        feedback: {
          kind: 'hint',
          message: step.hint,
        },
      }
    : state;
}

export function undoLessonMove(
  state: LessonRuntimeState,
): LessonRuntimeState {
  const previous = state.history[state.history.length - 1];

  return previous
    ? {
        ...previous,
        history: state.history.slice(0, -1),
        lessonId: state.lessonId,
      }
    : state;
}

export function restartLesson(
  lesson: ChessLesson,
): LessonRuntimeState {
  return createLessonRuntime(lesson);
}
