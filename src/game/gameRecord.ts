import {
  ChessGame,
  type ReplayPosition,
} from './chessState';

export type GameResult = '0-1' | '1-0' | '1/2-1/2' | '*';
export type GameRecordSource = 'imported' | 'played';

export type GameRecord = {
  blackProfileId?: string;
  blackName: string;
  clockLabel: string;
  createdAt: string;
  id: string;
  initialFen?: string;
  moveCount: number;
  pgn: string;
  result: GameResult;
  seriesId?: string;
  seriesGameNumber?: number;
  source: GameRecordSource;
  title: string;
  updatedAt: string;
  whiteProfileId?: string;
  whiteName: string;
};

type CreateGameRecordOptions = {
  blackProfileId?: string;
  clockLabel?: string;
  createdAt?: string;
  id?: string;
  initialFen?: string;
  pgn: string;
  result?: GameResult;
  seriesId?: string;
  seriesGameNumber?: number;
  source: GameRecordSource;
  whiteProfileId?: string;
};

const VALID_RESULTS = new Set<GameResult>([
  '0-1',
  '1-0',
  '1/2-1/2',
  '*',
]);

function createId(now: string): string {
  return `game-${Date.parse(now)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getPlayerName(value: string | undefined, fallback: string): string {
  const name = value?.trim();

  return !name || name === '?' ? fallback : name;
}

export function isGameResult(value: string | undefined): value is GameResult {
  return value !== undefined && VALID_RESULTS.has(value as GameResult);
}

export function createGameRecord({
  blackProfileId,
  clockLabel = '未记录',
  createdAt = new Date().toISOString(),
  id,
  initialFen,
  pgn,
  result,
  seriesId,
  seriesGameNumber,
  source,
  whiteProfileId,
}: CreateGameRecordOptions): GameRecord {
  const normalizedPgn = pgn.trim();

  if (!normalizedPgn) {
    throw new Error('PGN 内容不能为空');
  }

  const game = new ChessGame();

  try {
    game.loadPgn(normalizedPgn);
  } catch {
    throw new Error('无法读取 PGN，请检查棋谱格式和走法是否合法');
  }

  const headers = game.getHeaders();
  const whiteName = getPlayerName(headers.White, '白方');
  const blackName = getPlayerName(headers.Black, '黑方');
  const parsedResult = isGameResult(headers.Result)
    ? headers.Result
    : '*';
  const finalResult = result ?? parsedResult;

  return {
    blackProfileId,
    blackName,
    clockLabel,
    createdAt,
    id: id ?? createId(createdAt),
    initialFen,
    moveCount: game.getSnapshot().moveCount,
    pgn: normalizedPgn,
    result: finalResult,
    seriesGameNumber,
    seriesId,
    source,
    title: `${whiteName} vs ${blackName}`,
    updatedAt: new Date().toISOString(),
    whiteProfileId,
    whiteName,
  };
}

export function getReplayPositions(record: GameRecord): ReplayPosition[] {
  const game = new ChessGame();
  game.loadPgn(record.pgn);
  return game.getReplayPositions();
}

export function getResultLabel(result: GameResult): string {
  if (result === '1-0') {
    return '白方获胜';
  }

  if (result === '0-1') {
    return '黑方获胜';
  }

  if (result === '1/2-1/2') {
    return '和棋';
  }

  return '对局未结束';
}

export function isGameRecord(value: unknown): value is GameRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<GameRecord>;

  return (
    typeof record.id === 'string' &&
    typeof record.pgn === 'string' &&
    typeof record.title === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.moveCount === 'number' &&
    typeof record.clockLabel === 'string' &&
    typeof record.whiteName === 'string' &&
    typeof record.blackName === 'string' &&
    (record.source === 'played' || record.source === 'imported') &&
    isGameResult(record.result)
  );
}
