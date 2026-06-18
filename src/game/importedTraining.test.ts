import {
  createImportedTrainingRecord,
  createLessonFromImportedTraining,
} from './importedTraining';
import {
  applyLessonOpponentMove,
  attemptLessonMove,
  createLessonRuntime,
  getPendingLessonEngineOptions,
} from './lessonRuntime';
import { chooseAiMove } from './localAi';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  match: (actual: string, expected: RegExp) => void;
  ok: (value: unknown, message?: string) => void;
  throws: (callback: () => void, expected: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

function createRecord(
  category: 'classics' | 'endgames' | 'openings',
  pgn: string,
  humanColor: 'b' | 'w' = 'w',
) {
  return createImportedTrainingRecord({
    category,
    humanColor,
    pgn,
    title: `测试${category}`,
  });
}

function settleOpponent(
  lesson: ReturnType<typeof createLessonFromImportedTraining>,
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

test('opening import trains at most six full moves then enables free AI play', () => {
  const record = createRecord(
    'openings',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6',
  );
  const lesson = createLessonFromImportedTraining(record);

  assert.equal(lesson.interactive?.steps.length, 6);
  assert.equal(lesson.interactive?.freePlay?.difficulty, 'intermediate');
  assert.equal(lesson.training.standardStart, true);
});

test('opening runtime continues with autonomous AI after the imported line', () => {
  const lesson = createLessonFromImportedTraining(
    createRecord('openings', '1. e4 e5'),
  );
  let state = createLessonRuntime(lesson);

  state = attemptLessonMove(
    lesson,
    state,
    { from: 'e2', to: 'e4' },
    () => 0,
  );
  assert.equal(state.awaitingOpponent, true);
  state = settleOpponent(lesson, state);
  assert.equal(state.freePlay, true);
  assert.equal(state.completed, false);
  assert.equal(
    state.moves.map((move) => move.san).join(' '),
    'e4 e5',
  );

  state = attemptLessonMove(
    lesson,
    state,
    { from: 'g1', to: 'f3' },
    () => 0,
  );
  state = settleOpponent(lesson, state);
  assert.equal(state.freePlay, true);
  assert.ok(state.moves.length >= 4);
});

test('classic import follows the exact PGN and supports training black', () => {
  const lesson = createLessonFromImportedTraining(
    createRecord('classics', '1. e4 e5 2. Nf3 Nc6', 'b'),
  );
  let state = createLessonRuntime(lesson);

  assert.equal(state.awaitingOpponent, true);
  state = settleOpponent(lesson, state);
  assert.equal(state.moves[0].san, 'e4');
  assert.equal(state.turn, 'b');

  state = attemptLessonMove(lesson, state, {
    from: 'e7',
    to: 'e5',
  });
  state = settleOpponent(lesson, state);

  assert.equal(
    state.moves.map((move) => move.san).join(' '),
    'e4 e5 Nf3',
  );
  assert.equal(state.awaitingAdvance, true);
  assert.equal(lesson.interactive?.freePlay, undefined);
});

test('endgame import uses the final playable position and starts free AI play', () => {
  const lesson = createLessonFromImportedTraining(
    createRecord(
      'endgames',
      '[SetUp "1"]\n[FEN "8/4k3/8/4K3/4P3/8/8/8 w - - 0 1"]\n\n1. Kd5 Kd7',
    ),
  );
  let state = createLessonRuntime(lesson);

  assert.equal(lesson.interactive?.steps.length, 0);
  assert.equal(state.freePlay, true);
  assert.equal(state.turn, 'w');

  state = attemptLessonMove(
    lesson,
    state,
    { from: 'e4', to: 'e5' },
    () => 0,
  );
  state = settleOpponent(lesson, state);
  assert.ok(state.moves.length >= 1);
  assert.match(state.feedback.message, /AI|结束/);
});

test('opening and classic imports reject custom starting positions', () => {
  assert.throws(
    () =>
      createRecord(
        'classics',
        '[SetUp "1"]\n[FEN "8/4k3/8/4K3/4P3/8/8/8 w - - 0 1"]\n\n1. Kd5',
      ),
    /标准初始局面/,
  );
});
