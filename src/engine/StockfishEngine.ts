import StockfishEngineModule from '../../modules/stockfish-engine';
import type {
  ChessEngine,
  EngineRawAnalysis,
  EngineMove,
  EngineScore,
  EngineSearchOptions,
} from './ChessEngine';
import { parseUciMove, toUciMove } from './uci';
import type { AiDifficulty } from '../game/localAi';

const SKILL_LEVELS: Record<AiDifficulty, number> = {
  beginner: 2,
  intermediate: 5,
  novice: 0,
};

const MOVE_TIMES_MS: Record<AiDifficulty, number> = {
  beginner: 220,
  intermediate: 400,
  novice: 120,
};

export class StockfishEngine implements ChessEngine {
  readonly provider = 'stockfish' as const;

  async analyzePosition(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineRawAnalysis> {
    if (!StockfishEngineModule) {
      throw new Error('当前安装包不包含 Stockfish 原生模块');
    }

    const result = await StockfishEngineModule.analyze(
      fen,
      options.stockfishSkillLevel ?? SKILL_LEVELS[options.difficulty],
      options.moveTimeMs ?? MOVE_TIMES_MS[options.difficulty],
      (options.allowedMoves ?? []).map(toUciMove),
    );
    const move =
      result.bestMove === null || result.bestMove === '(none)'
        ? null
        : parseUciMove(result.bestMove);

    if (result.bestMove && !move) {
      throw new Error(`Stockfish 返回了无法识别的走法：${result.bestMove}`);
    }

    return {
      move,
      score: toEngineScore(result.scoreCp, result.mate),
    };
  }

  async getBestMove(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineMove | null> {
    if (!StockfishEngineModule) {
      throw new Error('当前安装包不包含 Stockfish 原生模块');
    }

    const bestMove = await StockfishEngineModule.getBestMove(
      fen,
      options.stockfishSkillLevel ?? SKILL_LEVELS[options.difficulty],
      options.moveTimeMs ?? MOVE_TIMES_MS[options.difficulty],
      (options.allowedMoves ?? []).map(toUciMove),
    );

    if (bestMove === null || bestMove === '(none)') {
      return null;
    }

    const parsed = parseUciMove(bestMove);

    if (!parsed) {
      throw new Error(`Stockfish 返回了无法识别的走法：${bestMove}`);
    }

    return parsed;
  }

  async isAvailable(): Promise<boolean> {
    return StockfishEngineModule
      ? StockfishEngineModule.isAvailable()
      : false;
  }

  async stop(): Promise<void> {
    if (StockfishEngineModule) {
      await StockfishEngineModule.stop();
    }
  }
}

function toEngineScore(
  scoreCp: number | null,
  mate: number | null,
): EngineScore | null {
  if (typeof mate === 'number') {
    return {
      type: 'mate',
      value: mate,
    };
  }

  if (typeof scoreCp === 'number') {
    return {
      type: 'cp',
      value: scoreCp,
    };
  }

  return null;
}
