import { ChessGame } from './chessState';
import { getBoardSquares } from '../components/Board/boardCoordinates';

declare const require: (id: string) => unknown;

type TestFunction = (
  name: string,
  callback: () => void | Promise<void>,
) => void;

type Assert = {
  deepEqual: (actual: unknown, expected: unknown) => void;
  equal: (actual: unknown, expected: unknown) => void;
  fail: (message: string) => never;
  match: (actual: string, expected: RegExp) => void;
  throws: (callback: () => void, expected?: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('allows a normal legal move and changes the turn', () => {
  const game = new ChessGame();
  const result = game.move('e2', 'e4');

  assert.equal(result.success, true);
  assert.equal(game.getPiece('e4')?.type, 'p');
  assert.equal(game.getPiece('e2'), null);
  assert.equal(game.getSnapshot().status.turn, 'b');
});

test('rejects an illegal move without changing the position', () => {
  const game = new ChessGame();
  const before = game.getSnapshot().fen;
  const result = game.move('e2', 'e5');

  assert.equal(result.success, false);
  assert.equal(game.getSnapshot().fen, before);
  assert.equal(game.getSnapshot().moveCount, 0);
});

test('detects check and checkmate', () => {
  const checkGame = new ChessGame();
  checkGame.move('e2', 'e4');
  checkGame.move('f7', 'f6');
  checkGame.move('d1', 'h5');

  assert.equal(checkGame.getSnapshot().status.isCheck, true);

  const mateGame = new ChessGame();
  mateGame.move('f2', 'f3');
  mateGame.move('e7', 'e5');
  mateGame.move('g2', 'g4');
  mateGame.move('d8', 'h4');

  assert.equal(mateGame.getSnapshot().status.isCheckmate, true);
  assert.equal(mateGame.getSnapshot().status.winner, 'b');
});

test('detects stalemate as a draw', () => {
  const game = new ChessGame(
    '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
  );
  const status = game.getSnapshot().status;

  assert.equal(status.isDraw, true);
  assert.equal(status.drawReason, 'stalemate');
  assert.equal(status.isGameOver, true);
});

test('supports king-side castling', () => {
  const game = new ChessGame(
    'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
  );
  const result = game.move('e1', 'g1');

  assert.equal(result.success, true);
  assert.equal(game.getPiece('g1')?.type, 'k');
  assert.equal(game.getPiece('f1')?.type, 'r');
});

test('supports en passant capture', () => {
  const game = new ChessGame(
    '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
  );
  const result = game.move('e5', 'd6');

  assert.equal(result.success, true);
  assert.equal(game.getPiece('d6')?.color, 'w');
  assert.equal(game.getPiece('d5'), null);
});

test('offers and applies all standard promotion choices', () => {
  const game = new ChessGame(
    '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
  );
  const promotionMoves = game
    .getLegalMoves('a7')
    .filter((move) => move.to === 'a8')
    .map((move) => move.promotion)
    .sort();

  assert.deepEqual(promotionMoves, ['b', 'n', 'q', 'r']);

  const result = game.move('a7', 'a8', 'n');
  assert.equal(result.success, true);
  assert.equal(game.getPiece('a8')?.type, 'n');
});

test('undo and reset restore the expected positions', () => {
  const game = new ChessGame();
  const initialFen = game.getSnapshot().fen;

  game.move('e2', 'e4');
  game.move('e7', 'e5');
  game.undo();

  assert.equal(game.getPiece('e7')?.type, 'p');
  assert.equal(game.getSnapshot().moveCount, 1);

  game.reset();
  assert.equal(game.getSnapshot().fen, initialFen);
  assert.equal(game.getSnapshot().moveCount, 0);
});

test('board flipping changes display order but not game state', () => {
  const game = new ChessGame();
  const fen = game.getSnapshot().fen;
  const normal = getBoardSquares(false);
  const flipped = getBoardSquares(true);

  assert.equal(normal[0][0], 'a8');
  assert.equal(normal[7][7], 'h1');
  assert.equal(flipped[0][0], 'h1');
  assert.equal(flipped[7][7], 'a8');
  assert.equal(game.getSnapshot().fen, fen);
});

test('blocks moves after the game has ended', () => {
  const game = new ChessGame(
    '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
  );
  const before = game.getSnapshot().fen;
  const result = game.move('h8', 'h7');

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.reason, 'game_over');
  } else {
    assert.fail('expected the move to be blocked after game over');
  }
  assert.equal(game.getSnapshot().fen, before);
});

test('exports and imports PGN without changing the final position', () => {
  const original = new ChessGame();
  original.move('e2', 'e4');
  original.move('e7', 'e5');
  original.move('g1', 'f3');

  const pgn = original.getPgn({
    Black: '黑方',
    Event: '测试对局',
    Result: '*',
    White: '白方',
  });
  const imported = new ChessGame();
  imported.loadPgn(pgn);

  assert.match(pgn, /1\. e4 e5 2\. Nf3/);
  assert.equal(imported.getSnapshot().fen, original.getSnapshot().fen);
  assert.equal(imported.getHeaders().Event, '测试对局');
});

test('creates a replay position for the start and every move', () => {
  const game = new ChessGame();
  game.move('d2', 'd4');
  game.move('d7', 'd5');
  game.move('c1', 'f4');

  const positions = game.getReplayPositions();

  assert.equal(positions.length, 4);
  assert.equal(positions[0].ply, 0);
  assert.equal(positions[0].snapshot.moveCount, 0);
  assert.equal(positions[3].move?.san, 'Bf4');
  assert.equal(positions[3].snapshot.fen, game.getSnapshot().fen);
});

test('rejects PGN containing an illegal move', () => {
  const game = new ChessGame();

  assert.throws(
    () => game.loadPgn('1. e4 e5 2. Ke3'),
    /Invalid move in PGN/,
  );
});
