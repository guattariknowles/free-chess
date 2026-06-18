import { LESSONS } from '../data/lessons/lessonCatalog';
import {
  advanceLesson,
  applyLessonOpponentMove,
  attemptLessonMove,
  createLessonRuntime,
  getPendingLessonEngineOptions,
  restartLesson,
  showLessonHint,
  undoLessonMove,
} from './lessonRuntime';
import { chooseAiMove } from './localAi';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  match: (actual: string, expected: RegExp) => void;
  ok: (value: unknown, message?: string) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

function getLesson(id: string) {
  const lesson = LESSONS.find((item) => item.id === id);

  if (!lesson) {
    throw new Error(`找不到课程：${id}`);
  }

  return lesson;
}

function settleOpponent(
  lesson: ReturnType<typeof getLesson>,
  state: ReturnType<typeof createLessonRuntime>,
  random: () => number = () => 0,
) {
  const options = getPendingLessonEngineOptions(lesson, state);

  if (!options) {
    return state;
  }

  const move = chooseAiMove(
    state.fen,
    options.difficulty,
    random,
    options.allowedMoves,
  );

  return applyLessonOpponentMove(lesson, state, move);
}

function enterGeneratedFocus(lesson: ReturnType<typeof getLesson>) {
  let state = createLessonRuntime(lesson);

  for (const move of [
    { from: 'e2' as const, to: 'e4' as const },
    { from: 'g1' as const, to: 'f3' as const },
    { from: 'f1' as const, to: 'c4' as const },
  ]) {
    state = attemptLessonMove(lesson, state, move, () => 0);
    state = settleOpponent(lesson, state);
    state = advanceLesson(lesson, state);
  }

  return state;
}

test('Italian lesson accepts the main line and constrained AI replies', () => {
  const lesson = getLesson('opening-italian');
  let state = createLessonRuntime(lesson);

  state = attemptLessonMove(lesson, state, {
    from: 'e2',
    to: 'e4',
  });
  assert.equal(state.awaitingOpponent, true);
  state = settleOpponent(lesson, state);
  assert.equal(state.awaitingAdvance, true);
  assert.equal(state.moves.map((move) => move.san).join(' '), 'e4 e5');

  state = advanceLesson(lesson, state);
  state = attemptLessonMove(lesson, state, {
    from: 'g1',
    to: 'f3',
  });
  state = settleOpponent(lesson, state);
  state = advanceLesson(lesson, state);
  state = attemptLessonMove(lesson, state, {
    from: 'f1',
    to: 'c4',
  });
  state = settleOpponent(lesson, state);

  assert.equal(state.completed, true);
  assert.equal(
    state.moves.map((move) => move.san).join(' '),
    'e4 e5 Nf3 Nc6 Bc4',
  );
});

test('recommended-move lessons receive a working generated interaction', () => {
  const lesson = getLesson('piece-knight');
  const focus = enterGeneratedFocus(lesson);
  const state = attemptLessonMove(
    lesson,
    focus,
    { from: 'd4', to: 'f5' },
    () => 0,
  );
  const settled = settleOpponent(lesson, state);

  assert.equal(settled.completed, true);
  assert.equal(settled.moves[6].from, 'd4');
  assert.equal(settled.moves[6].to, 'f5');
  assert.ok(settled.moves.length >= 7);
});

test('wrong and illegal moves give feedback without changing the board', () => {
  const lesson = getLesson('opening-italian');
  const initial = createLessonRuntime(lesson);
  const wrong = attemptLessonMove(lesson, initial, {
    from: 'a2',
    to: 'a3',
  });
  const illegal = attemptLessonMove(lesson, wrong, {
    from: 'e2',
    to: 'e5',
  });

  assert.equal(wrong.fen, initial.fen);
  assert.equal(illegal.fen, initial.fen);
  assert.equal(illegal.errors, 2);
  assert.equal(illegal.feedback.kind, 'error');
});

test('strategy lesson uses local AI only inside its allowed replies', () => {
  const lesson = getLesson('strategy-center');
  const state = attemptLessonMove(
    lesson,
    createLessonRuntime(lesson),
    { from: 'd2', to: 'd4' },
    () => 0.75,
  );
  const settled = settleOpponent(lesson, state, () => 0.75);

  assert.equal(settled.completed, true);
  assert.equal(settled.moves[0].san, 'd4');
  assert.equal(settled.moves[1].from, 'g8');
  assert.equal(settled.moves[1].to, 'f6');
});

test('endgame lesson supports hint, undo, retry and restart', () => {
  const lesson = getLesson('endgame-king-pawn');
  const initial = createLessonRuntime(lesson);
  const focus = enterGeneratedFocus(lesson);
  const hinted = showLessonHint(lesson, focus);
  const firstStep = settleOpponent(
    lesson,
    attemptLessonMove(
      lesson,
      hinted,
      { from: 'e5', to: 'd5' },
      () => 0,
    ),
  );

  assert.equal(hinted.feedback.kind, 'hint');
  assert.equal(firstStep.moves.length, 8);

  const undone = undoLessonMove(firstStep);
  assert.equal(undone.fen, focus.fen);
  assert.equal(undone.moves.length, 6);

  const retried = advanceLesson(
    lesson,
    settleOpponent(
      lesson,
      attemptLessonMove(
        lesson,
        undone,
        { from: 'e5', to: 'd5' },
        () => 0,
      ),
    ),
  );
  const completed = settleOpponent(
    lesson,
    attemptLessonMove(lesson, retried, {
      from: 'e4',
      to: 'e5',
    }),
  );

  assert.equal(completed.completed, true);
  assert.match(completed.feedback.message, /通路兵/);

  const restarted = restartLesson(lesson);
  assert.equal(restarted.fen, initial.fen);
  assert.equal(restarted.completed, false);
  assert.equal(restarted.errors, 0);
});
