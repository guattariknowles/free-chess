import type { AiDifficulty, AiMoveConstraint } from '../game/localAi';
import type { LegalMove } from '../game/chessState';

export type EngineProvider = 'simple' | 'stockfish';

export type EngineMove = Pick<
  LegalMove,
  'from' | 'promotion' | 'to'
>;

export type EngineSearchOptions = {
  allowedMoves?: AiMoveConstraint[];
  difficulty: AiDifficulty;
  moveTimeMs?: number;
  timeoutMs?: number;
};

export type EngineSearchResult = {
  fallbackReason?: string;
  move: LegalMove | null;
  provider: EngineProvider;
};

export interface ChessEngine {
  readonly provider: EngineProvider;
  getBestMove(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineMove | null>;
  isAvailable(): Promise<boolean>;
  stop(): Promise<void>;
}
