import type { ClockConfig } from './clockState';
import type { GameRecord, GameResult } from './gameRecord';
import {
  BLITZ_TIEBREAK_CONFIG,
  completeSeriesGame,
  createSeries,
  getSeriesScores,
  RAPID_TIEBREAK_CONFIG,
  type SeriesRecord,
} from './series';
import type { UserProfile } from './userProfile';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  deepEqual: (actual: unknown, expected: unknown) => void;
  equal: (actual: unknown, expected: unknown) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

const NO_CLOCK: ClockConfig = {
  incrementMs: 0,
  initialTimeMs: null,
};

const ALICE: UserProfile = {
  createdAt: '2026-06-12T00:00:00.000Z',
  id: 'alice',
  name: 'Alice',
  updatedAt: '2026-06-12T00:00:00.000Z',
};

const BOB: UserProfile = {
  createdAt: '2026-06-12T00:00:00.000Z',
  id: 'bob',
  name: 'Bob',
  updatedAt: '2026-06-12T00:00:00.000Z',
};

function record(
  series: SeriesRecord,
  result: Exclude<GameResult, '*'>,
): GameRecord {
  const current = series.currentGame;

  if (!current) {
    throw new Error('test expected a current game');
  }

  return {
    blackName:
      current.blackProfileId === ALICE.id ? ALICE.name : BOB.name,
    blackProfileId: current.blackProfileId,
    clockLabel: '无棋钟',
    createdAt: '2026-06-12T00:00:00.000Z',
    id: `game-${current.gameNumber}`,
    moveCount: 1,
    pgn: '1. e4 *',
    result,
    seriesGameNumber: current.gameNumber,
    seriesId: series.id,
    source: 'played',
    title: 'test',
    updatedAt: '2026-06-12T00:00:00.000Z',
    whiteName:
      current.whiteProfileId === ALICE.id ? ALICE.name : BOB.name,
    whiteProfileId: current.whiteProfileId,
  };
}

function finish(
  series: SeriesRecord,
  result: Exclude<GameResult, '*'>,
): SeriesRecord {
  return completeSeriesGame(
    series,
    record(series, result),
    () => 0,
    '2026-06-12T00:01:00.000Z',
  );
}

test('alternates colors and scores wins and draws with FIDE points', () => {
  let series = createSeries({
    id: 'series-a',
    mainClockConfig: NO_CLOCK,
    mainGameCount: 4,
    now: '2026-06-12T00:00:00.000Z',
    playerOne: ALICE,
    playerTwo: BOB,
    random: () => 0,
  });

  assert.equal(series.currentGame?.whiteProfileId, ALICE.id);
  series = finish(series, '1-0');
  assert.equal(series.currentGame?.whiteProfileId, BOB.id);
  series = finish(series, '1/2-1/2');
  assert.deepEqual(getSeriesScores(series), {
    playerOne: 1.5,
    playerTwo: 0.5,
  });
});

test('uses rapid tiebreaks after a tied fixed-length match', () => {
  let series = createSeries({
    mainClockConfig: NO_CLOCK,
    mainGameCount: 2,
    playerOne: ALICE,
    playerTwo: BOB,
    random: () => 0,
  });

  series = finish(series, '1/2-1/2');
  series = finish(series, '1/2-1/2');

  assert.equal(series.currentGame?.stage, 'rapid');
  assert.deepEqual(series.currentGame?.clockConfig, RAPID_TIEBREAK_CONFIG);

  series = finish(series, '1-0');
  series = finish(series, '1/2-1/2');

  assert.equal(series.status, 'completed');
  assert.equal(series.winnerProfileId, ALICE.id);
});

test('continues through blitz and alternating sudden-death games', () => {
  let series = createSeries({
    mainClockConfig: NO_CLOCK,
    mainGameCount: 2,
    playerOne: ALICE,
    playerTwo: BOB,
    random: () => 0,
  });

  for (let index = 0; index < 6; index += 1) {
    series = finish(series, '1/2-1/2');
  }

  assert.equal(series.currentGame?.stage, 'sudden_death');
  assert.deepEqual(series.currentGame?.clockConfig, BLITZ_TIEBREAK_CONFIG);
  assert.equal(series.currentGame?.whiteProfileId, ALICE.id);

  series = finish(series, '1/2-1/2');
  assert.equal(series.currentGame?.whiteProfileId, BOB.id);

  series = finish(series, '1-0');
  assert.equal(series.status, 'completed');
  assert.equal(series.winnerProfileId, BOB.id);
});
