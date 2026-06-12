import {
  buildPositionFen,
  createEmptyPositionDraft,
  movePositionPiece,
  parsePositionFen,
  setPositionPiece,
  STANDARD_START_FEN,
  validateCustomPosition,
  validatePositionDraft,
} from './customPosition';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  deepEqual: (actual: unknown, expected: unknown) => void;
  equal: (actual: unknown, expected: unknown) => void;
  throws: (callback: () => void, expected?: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('parses and rebuilds the standard FEN without changing it', () => {
  const draft = parsePositionFen(STANDARD_START_FEN);

  assert.equal(draft.board.length, 32);
  assert.equal(buildPositionFen(draft), STANDARD_START_FEN);
  assert.equal(validatePositionDraft(draft), STANDARD_START_FEN);
});

test('supports adding, moving, and removing pieces in a draft', () => {
  let draft = createEmptyPositionDraft();

  draft = setPositionPiece(draft, 'e1', { color: 'w', type: 'k' });
  draft = setPositionPiece(draft, 'e8', { color: 'b', type: 'k' });
  draft = setPositionPiece(draft, 'a2', { color: 'w', type: 'r' });
  draft = movePositionPiece(draft, 'a2', 'a7');

  assert.equal(
    draft.board.find((piece) => piece.square === 'a7')?.type,
    'r',
  );
  assert.equal(
    draft.board.find((piece) => piece.square === 'a2'),
    undefined,
  );
  assert.equal(
    validatePositionDraft(draft),
    '4k3/R7/8/8/8/8/8/4K3 w - - 0 1',
  );
});

test('rejects drafts without both kings or with a pawn on the last rank', () => {
  const empty = createEmptyPositionDraft();

  assert.throws(() => validatePositionDraft(empty), /白王数量必须为 1/);

  let draft = setPositionPiece(empty, 'e1', {
    color: 'w',
    type: 'k',
  });
  draft = setPositionPiece(draft, 'e8', { color: 'b', type: 'k' });
  draft = setPositionPiece(draft, 'a8', { color: 'w', type: 'p' });

  assert.throws(() => validatePositionDraft(draft), /兵不能放在/);
});

test('rejects adjacent kings', () => {
  let draft = createEmptyPositionDraft();

  draft = setPositionPiece(draft, 'e1', { color: 'w', type: 'k' });
  draft = setPositionPiece(draft, 'e2', { color: 'b', type: 'k' });

  assert.throws(() => validatePositionDraft(draft), /双方王不能相邻/);
});

test('rejects castling rights when the required rook is absent', () => {
  let draft = createEmptyPositionDraft();

  draft = setPositionPiece(draft, 'e1', { color: 'w', type: 'k' });
  draft = setPositionPiece(draft, 'e8', { color: 'b', type: 'k' });
  draft = {
    ...draft,
    castling: {
      ...draft.castling,
      whiteKingSide: true,
    },
  };

  assert.throws(() => validatePositionDraft(draft), /白车在 h1/);
});

test('rejects a checkmate position as a normal local game start', () => {
  const result = validateCustomPosition(
    parsePositionFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1'),
  );

  assert.equal(result.ok, false);
  assert.equal(result.type, 'TerminalStart');

  if (!result.ok) {
    assert.equal(result.terminal, 'checkmate');
    assert.equal(result.issues[0].code, 'terminal_position');
    assert.deepEqual(result.issues[0].squares.sort(), ['g7', 'h8']);
  }
});

test('rejects a stalemate position as a normal local game start', () => {
  const result = validateCustomPosition(
    parsePositionFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'),
  );

  assert.equal(result.ok, false);
  assert.equal(result.type, 'TerminalStart');

  if (!result.ok) {
    assert.equal(result.terminal, 'stalemate');
    assert.equal(result.issues[0].code, 'terminal_position');
  }
});

test('rejects a position where the non-moving king is in check', () => {
  const result = validateCustomPosition(
    parsePositionFen('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1'),
  );

  assert.equal(result.ok, false);
  assert.equal(result.type, 'InvalidPosition');

  if (!result.ok) {
    assert.equal(result.issues[0].code, 'non_moving_king_in_check');
    assert.deepEqual(result.issues[0].squares.sort(), ['e2', 'e8']);
  }
});

test('rejects a position where both kings are in check', () => {
  const result = validateCustomPosition(
    parsePositionFen('R3k3/8/8/8/8/8/8/r3K3 w - - 0 1'),
  );

  assert.equal(result.ok, false);
  assert.equal(result.type, 'InvalidPosition');

  if (!result.ok) {
    assert.equal(result.issues[0].code, 'both_kings_in_check');
    assert.deepEqual(result.issues[0].squares.sort(), [
      'a1',
      'a8',
      'e1',
      'e8',
    ]);
  }
});
