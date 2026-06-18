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
  stockfishSkillLevel?: number;
  timeoutMs?: number;
};

export type EngineSearchResult = {
  fallbackReason?: string;
  move: LegalMove | null;
  provider: EngineProvider;
};

export type EngineScore =
  | {
      type: 'cp';
      value: number;
    }
  | {
      type: 'mate';
      value: number;
    };

export type EnginePositionAnalysis = {
  fallbackReason?: string;
  move: LegalMove | null;
  provider: EngineProvider;
  score: EngineScore | null;
};

export type EngineRawAnalysis = {
  move: EngineMove | null;
  score: EngineScore | null;
};

export interface ChessEngine {
  readonly provider: EngineProvider;
  analyzePosition(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineRawAnalysis>;
  getBestMove(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineMove | null>;
  isAvailable(): Promise<boolean>;
  stop(): Promise<void>;
}
