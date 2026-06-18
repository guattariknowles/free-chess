import type {
  ChessEngine,
  EngineMove,
  EngineSearchOptions,
} from './ChessEngine';
import { chooseAiMove } from '../game/localAi';

export class SimpleEngine implements ChessEngine {
  readonly provider = 'simple' as const;

  constructor(private readonly random: () => number = Math.random) {}

  async getBestMove(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineMove | null> {
    const move = chooseAiMove(
      fen,
      options.difficulty,
      this.random,
      options.allowedMoves,
    );

    return move
      ? {
          from: move.from,
          promotion: move.promotion,
          to: move.to,
        }
      : null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async stop(): Promise<void> {
    return;
  }
}
