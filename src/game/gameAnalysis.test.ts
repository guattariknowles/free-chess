import {
  createMoveReview,
  formatMoveReview,
  summarizeMoveReviews,
} from './gameAnalysis';
import { ChessGame } from './chessState';
import type { EnginePositionAnalysis } from '../engine/ChessEngine';

declare const require: (id: string) => unknown;

type TestFunction = (
  name: string,
  callback: () => void | Promise<void>,
) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  match: (actual: string, expected: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

function getReplay(pgn: string) {
  const game = new ChessGame();
  game.loadPgn(pgn);
  return game.getReplayPositions();
}

test('move review marks an exact Stockfish match as best', () => {
  const replay = getReplay('1. e4 e5 *');
  const result: EnginePositionAnalysis = {
    move: replay[1].move,
    provider: 'stockfish',
    score: {
      type: 'cp',
      value: 34,
    },
  };
  const review = createMoveReview(replay[0], replay[1], result);

  assert.equal(review.grade, 'best');
  assert.equal(review.bestMoveSan, 'e4');
  assert.equal(review.scoreLabel, '白方 +0.34');
  assert.match(formatMoveReview(review), /首选一致/);
  assert.match(formatMoveReview(review), /评分：白方 \+0.34/);
});

test('move review asks for review when Stockfish prefers another move', () => {
  const replay = getReplay('1. e4 e5 *');
  const result: EnginePositionAnalysis = {
    move: {
      from: 'd2',
      san: 'd4',
      to: 'd4',
    },
    provider: 'stockfish',
    score: {
      type: 'cp',
      value: 20,
    },
  };
  const review = createMoveReview(replay[0], replay[1], result);

  assert.equal(review.grade, 'review');
  assert.equal(review.bestMoveSan, 'd4');
  assert.match(review.explanation, /建议/);
});

test('move review does not pretend fallback AI is Stockfish analysis', () => {
  const replay = getReplay('1. e4 e5 *');
  const result: EnginePositionAnalysis = {
    fallbackReason: 'Stockfish 当前不可用',
    move: replay[1].move,
    provider: 'simple',
    score: null,
  };
  const review = createMoveReview(replay[0], replay[1], result);

  assert.equal(review.grade, 'unavailable');
  assert.match(review.explanation, /Stockfish/);
});

test('review summary counts analyzed move categories', () => {
  const replay = getReplay('1. e4 e5 *');
  const best = createMoveReview(replay[0], replay[1], {
    move: replay[1].move,
    provider: 'stockfish',
    score: null,
  });
  const unavailable = createMoveReview(replay[1], replay[2], {
    move: null,
    provider: 'stockfish',
    score: null,
  });
  const summary = summarizeMoveReviews([best, unavailable], 4);

  assert.equal(summary.analyzed, 2);
  assert.equal(summary.best, 1);
  assert.equal(summary.unavailable, 1);
  assert.equal(summary.white.overlapPercent, 100);
  assert.equal(summary.black.overlapPercent, null);
  assert.match(summary.summaryText, /剩余 2 步/);
});

test('review summary reports AI overlap for both sides', () => {
  const replay = getReplay('1. e4 e5 2. Nf3 Nc6 *');
  const reviews = [
    createMoveReview(replay[0], replay[1], {
      move: replay[1].move,
      provider: 'stockfish',
      score: {
        type: 'cp',
        value: 30,
      },
    }),
    createMoveReview(replay[1], replay[2], {
      move: {
        from: 'c7',
        san: 'c5',
        to: 'c5',
      },
      provider: 'stockfish',
      score: {
        type: 'cp',
        value: 40,
      },
    }),
    createMoveReview(replay[2], replay[3], {
      move: replay[3].move,
      provider: 'stockfish',
      score: {
        type: 'cp',
        value: 25,
      },
    }),
    createMoveReview(replay[3], replay[4], {
      move: replay[4].move,
      provider: 'stockfish',
      score: {
        type: 'cp',
        value: -15,
      },
    }),
  ];
  const summary = summarizeMoveReviews(reviews, 4);

  assert.equal(summary.white.overlapPercent, 100);
  assert.equal(summary.black.overlapPercent, 50);
  assert.match(summary.summaryText, /白方重合度 100%/);
  assert.match(summary.summaryText, /黑方重合度 50%/);
});
