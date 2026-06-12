import type { Color } from 'chess.js';

import type { ClockConfig, ClockState } from './clockState';
import type { GameRecord, GameResult } from './gameRecord';
import type { UserProfile } from './userProfile';

export type SeriesStage = 'blitz' | 'main' | 'rapid' | 'sudden_death';
export type SeriesStatus = 'active' | 'completed';

export type SeriesCurrentGame = {
  blackProfileId: string;
  clockConfig: ClockConfig;
  clockState?: ClockState;
  gameNumber: number;
  pgn?: string;
  stage: SeriesStage;
  stageGameNumber: number;
  startedAt: string;
  whiteProfileId: string;
};

export type SeriesGame = {
  blackProfileId: string;
  gameNumber: number;
  record: GameRecord;
  stage: SeriesStage;
  stageGameNumber: number;
  whiteProfileId: string;
};

export type SeriesRecord = {
  blitzFirstWhiteProfileId?: string;
  createdAt: string;
  currentGame?: SeriesCurrentGame;
  games: SeriesGame[];
  id: string;
  mainClockConfig: ClockConfig;
  mainFirstWhiteProfileId: string;
  mainGameCount: number;
  playerOne: UserProfile;
  playerTwo: UserProfile;
  rapidFirstWhiteProfileId?: string;
  status: SeriesStatus;
  suddenDeathFirstWhiteProfileId?: string;
  title: string;
  updatedAt: string;
  winnerProfileId?: string;
};

type CreateSeriesOptions = {
  id?: string;
  mainClockConfig: ClockConfig;
  mainGameCount: number;
  now?: string;
  playerOne: UserProfile;
  playerTwo: UserProfile;
  random?: () => number;
};

export const RAPID_TIEBREAK_CONFIG: ClockConfig = {
  incrementMs: 5_000,
  initialTimeMs: 10 * 60_000,
};

export const BLITZ_TIEBREAK_CONFIG: ClockConfig = {
  incrementMs: 2_000,
  initialTimeMs: 3 * 60_000,
};

function createId(now: string): string {
  return `series-${Date.parse(now)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getOtherPlayerId(series: SeriesRecord, id: string): string {
  return id === series.playerOne.id
    ? series.playerTwo.id
    : series.playerOne.id;
}

function chooseFirstWhite(
  series: SeriesRecord,
  random: () => number,
): string {
  return random() < 0.5 ? series.playerOne.id : series.playerTwo.id;
}

function getStageGames(
  series: SeriesRecord,
  stage: SeriesStage,
): SeriesGame[] {
  return series.games.filter((game) => game.stage === stage);
}

function getStageFirstWhite(
  series: SeriesRecord,
  stage: SeriesStage,
): string | undefined {
  if (stage === 'main') {
    return series.mainFirstWhiteProfileId;
  }

  if (stage === 'rapid') {
    return series.rapidFirstWhiteProfileId;
  }

  if (stage === 'blitz') {
    return series.blitzFirstWhiteProfileId;
  }

  return series.suddenDeathFirstWhiteProfileId;
}

function getClockConfig(
  series: SeriesRecord,
  stage: SeriesStage,
): ClockConfig {
  return stage === 'main'
    ? series.mainClockConfig
    : stage === 'rapid'
      ? RAPID_TIEBREAK_CONFIG
      : BLITZ_TIEBREAK_CONFIG;
}

function createCurrentGame(
  series: SeriesRecord,
  stage: SeriesStage,
  stageGameNumber: number,
  now: string,
): SeriesCurrentGame {
  const firstWhite = getStageFirstWhite(series, stage);

  if (!firstWhite) {
    throw new Error('系列赛缺少本阶段的首局颜色抽签结果');
  }

  const whiteProfileId =
    stageGameNumber % 2 === 1
      ? firstWhite
      : getOtherPlayerId(series, firstWhite);

  return {
    blackProfileId: getOtherPlayerId(series, whiteProfileId),
    clockConfig: getClockConfig(series, stage),
    gameNumber: series.games.length + 1,
    stage,
    stageGameNumber,
    startedAt: now,
    whiteProfileId,
  };
}

function resultPoints(
  result: GameResult,
  profileId: string,
  whiteProfileId: string,
  blackProfileId: string,
): number {
  if (result === '1/2-1/2') {
    return 0.5;
  }

  if (result === '1-0') {
    return profileId === whiteProfileId ? 1 : 0;
  }

  if (result === '0-1') {
    return profileId === blackProfileId ? 1 : 0;
  }

  return 0;
}

function stageIsTied(series: SeriesRecord, stage: SeriesStage): boolean {
  const games = getStageGames(series, stage);
  const firstPoints = games.reduce(
    (total, game) =>
      total +
      resultPoints(
        game.record.result,
        series.playerOne.id,
        game.whiteProfileId,
        game.blackProfileId,
      ),
    0,
  );
  const secondPoints = games.length - firstPoints;

  return firstPoints === secondPoints;
}

function getOverallLeader(series: SeriesRecord): string | undefined {
  const scores = getSeriesScores(series);

  if (scores.playerOne === scores.playerTwo) {
    return undefined;
  }

  return scores.playerOne > scores.playerTwo
    ? series.playerOne.id
    : series.playerTwo.id;
}

function advanceSeries(
  series: SeriesRecord,
  random: () => number,
  now: string,
): SeriesRecord {
  const mainGames = getStageGames(series, 'main');

  if (mainGames.length < series.mainGameCount) {
    return {
      ...series,
      currentGame: createCurrentGame(
        series,
        'main',
        mainGames.length + 1,
        now,
      ),
      updatedAt: now,
    };
  }

  if (!stageIsTied(series, 'main')) {
    return {
      ...series,
      currentGame: undefined,
      status: 'completed',
      updatedAt: now,
      winnerProfileId: getOverallLeader(series),
    };
  }

  const rapidGames = getStageGames(series, 'rapid');

  if (!series.rapidFirstWhiteProfileId) {
    const withDraw = {
      ...series,
      rapidFirstWhiteProfileId: chooseFirstWhite(series, random),
    };

    return {
      ...withDraw,
      currentGame: createCurrentGame(withDraw, 'rapid', 1, now),
      updatedAt: now,
    };
  }

  if (rapidGames.length < 2) {
    return {
      ...series,
      currentGame: createCurrentGame(
        series,
        'rapid',
        rapidGames.length + 1,
        now,
      ),
      updatedAt: now,
    };
  }

  if (!stageIsTied(series, 'rapid')) {
    return {
      ...series,
      currentGame: undefined,
      status: 'completed',
      updatedAt: now,
      winnerProfileId: getOverallLeader(series),
    };
  }

  const blitzGames = getStageGames(series, 'blitz');

  if (!series.blitzFirstWhiteProfileId) {
    const withDraw = {
      ...series,
      blitzFirstWhiteProfileId: chooseFirstWhite(series, random),
    };

    return {
      ...withDraw,
      currentGame: createCurrentGame(withDraw, 'blitz', 1, now),
      updatedAt: now,
    };
  }

  if (blitzGames.length < 2) {
    return {
      ...series,
      currentGame: createCurrentGame(
        series,
        'blitz',
        blitzGames.length + 1,
        now,
      ),
      updatedAt: now,
    };
  }

  if (!stageIsTied(series, 'blitz')) {
    return {
      ...series,
      currentGame: undefined,
      status: 'completed',
      updatedAt: now,
      winnerProfileId: getOverallLeader(series),
    };
  }

  const suddenGames = getStageGames(series, 'sudden_death');
  const lastSuddenGame = suddenGames[suddenGames.length - 1];

  if (lastSuddenGame && lastSuddenGame.record.result !== '1/2-1/2') {
    return {
      ...series,
      currentGame: undefined,
      status: 'completed',
      updatedAt: now,
      winnerProfileId:
        lastSuddenGame.record.result === '1-0'
          ? lastSuddenGame.whiteProfileId
          : lastSuddenGame.blackProfileId,
    };
  }

  if (!series.suddenDeathFirstWhiteProfileId) {
    const withDraw = {
      ...series,
      suddenDeathFirstWhiteProfileId: chooseFirstWhite(series, random),
    };

    return {
      ...withDraw,
      currentGame: createCurrentGame(
        withDraw,
        'sudden_death',
        1,
        now,
      ),
      updatedAt: now,
    };
  }

  return {
    ...series,
    currentGame: createCurrentGame(
      series,
      'sudden_death',
      suddenGames.length + 1,
      now,
    ),
    updatedAt: now,
  };
}

export function createSeries({
  id,
  mainClockConfig,
  mainGameCount,
  now = new Date().toISOString(),
  playerOne,
  playerTwo,
  random = Math.random,
}: CreateSeriesOptions): SeriesRecord {
  if (playerOne.id === playerTwo.id) {
    throw new Error('系列赛必须选择两个不同的本地档案');
  }

  if (
    !Number.isInteger(mainGameCount) ||
    mainGameCount < 2 ||
    mainGameCount > 9
  ) {
    throw new Error('固定局数必须是 2 到 9 的整数');
  }

  const base: SeriesRecord = {
    createdAt: now,
    games: [],
    id: id ?? createId(now),
    mainClockConfig,
    mainFirstWhiteProfileId:
      random() < 0.5 ? playerOne.id : playerTwo.id,
    mainGameCount,
    playerOne,
    playerTwo,
    status: 'active',
    title: `${playerOne.name} vs ${playerTwo.name} · BO${mainGameCount}`,
    updatedAt: now,
  };

  return advanceSeries(base, random, now);
}

export function updateSeriesProgress(
  series: SeriesRecord,
  progress: Pick<SeriesCurrentGame, 'clockState' | 'pgn'>,
  now = new Date().toISOString(),
): SeriesRecord {
  if (!series.currentGame || series.status !== 'active') {
    return series;
  }

  return {
    ...series,
    currentGame: {
      ...series.currentGame,
      ...progress,
    },
    updatedAt: now,
  };
}

export function completeSeriesGame(
  series: SeriesRecord,
  record: GameRecord,
  random: () => number = Math.random,
  now = new Date().toISOString(),
): SeriesRecord {
  const current = series.currentGame;

  if (!current || series.status !== 'active') {
    throw new Error('当前没有可完成的系列赛单局');
  }

  if (record.result === '*') {
    throw new Error('未结束的棋局不能计入系列赛比分');
  }

  const completed: SeriesRecord = {
    ...series,
    currentGame: undefined,
    games: [
      ...series.games,
      {
        blackProfileId: current.blackProfileId,
        gameNumber: current.gameNumber,
        record,
        stage: current.stage,
        stageGameNumber: current.stageGameNumber,
        whiteProfileId: current.whiteProfileId,
      },
    ],
    updatedAt: now,
  };

  return advanceSeries(completed, random, now);
}

export function getSeriesScores(series: SeriesRecord): {
  playerOne: number;
  playerTwo: number;
} {
  const playerOne = series.games.reduce(
    (total, game) =>
      total +
      resultPoints(
        game.record.result,
        series.playerOne.id,
        game.whiteProfileId,
        game.blackProfileId,
      ),
    0,
  );

  return {
    playerOne,
    playerTwo: series.games.length - playerOne,
  };
}

export function getSeriesPlayerName(
  series: SeriesRecord,
  profileId: string,
): string {
  return profileId === series.playerOne.id
    ? series.playerOne.name
    : series.playerTwo.name;
}

export function getSeriesStageLabel(stage: SeriesStage): string {
  if (stage === 'main') {
    return '固定局数';
  }

  if (stage === 'rapid') {
    return '快棋加赛';
  }

  if (stage === 'blitz') {
    return '超快棋加赛';
  }

  return '突然死亡超快棋';
}

export function getSeriesResultLabel(series: SeriesRecord): string {
  const scores = getSeriesScores(series);

  if (series.status === 'active') {
    return `${scores.playerOne} : ${scores.playerTwo} · 进行中`;
  }

  if (!series.winnerProfileId) {
    return `${scores.playerOne} : ${scores.playerTwo} · 已结束`;
  }

  return `${scores.playerOne} : ${scores.playerTwo} · ${getSeriesPlayerName(
    series,
    series.winnerProfileId,
  )}获胜`;
}

function isClockConfig(value: unknown): value is ClockConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as Partial<ClockConfig>;

  return (
    (config.initialTimeMs === null ||
      typeof config.initialTimeMs === 'number') &&
    typeof config.incrementMs === 'number'
  );
}

export function isSeriesRecord(value: unknown): value is SeriesRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const series = value as Partial<SeriesRecord>;

  return (
    typeof series.id === 'string' &&
    typeof series.title === 'string' &&
    typeof series.createdAt === 'string' &&
    typeof series.updatedAt === 'string' &&
    typeof series.mainGameCount === 'number' &&
    typeof series.mainFirstWhiteProfileId === 'string' &&
    isClockConfig(series.mainClockConfig) &&
    Array.isArray(series.games) &&
    (series.status === 'active' || series.status === 'completed') &&
    Boolean(series.playerOne) &&
    Boolean(series.playerTwo)
  );
}

export function getProfileColor(
  currentGame: SeriesCurrentGame,
  profileId: string,
): Color {
  return currentGame.whiteProfileId === profileId ? 'w' : 'b';
}
