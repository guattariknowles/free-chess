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
  assert.equal(review.displayBucket, 'best');
  assert.equal(review.bestMoveSan, 'e4');
  assert.equal(review.scoreLabel, '白方 +0.34');
  assert.match(formatMoveReview(review), /推荐走法一致/);
  assert.match(formatMoveReview(review), /评估：白方 \+0.34/);
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
  const afterResult: EnginePositionAnalysis = {
    move: replay[2].move,
    provider: 'stockfish',
    score: {
      type: 'cp',
      value: 80,
    },
  };
  const review = createMoveReview(replay[0], replay[1], result, afterResult);

  assert.equal(review.grade, 'review');
  assert.equal(review.displayBucket, 'question');
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
  assert.match(review.explanation, /没有完成深度分析/);
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
  assert.equal(summary.white.recommendationMatchRate, 100);
  assert.equal(summary.black.recommendationMatchRate, null);
  assert.match(summary.summaryText, /复盘进度 50%/);
});

test('review summary reports recommendation match rate for both sides', () => {
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

  assert.equal(summary.white.recommendationMatchRate, 100);
  assert.equal(summary.black.recommendationMatchRate, 50);
  assert.match(summary.summaryText, /白方吻合率 100%/);
  assert.match(summary.summaryText, /黑方吻合率 50%/);
});
