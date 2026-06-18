import { requireOptionalNativeModule } from 'expo-modules-core';

export type StockfishEngineNativeModule = {
  analyze(
    fen: string,
    skillLevel: number,
    moveTimeMs: number,
    allowedMoves: string[],
  ): Promise<StockfishAnalysisNativeResult>;
  getBestMove(
    fen: string,
    skillLevel: number,
    moveTimeMs: number,
    allowedMoves: string[],
  ): Promise<string | null>;
  isAvailable(): Promise<boolean>;
  stop(): Promise<void>;
};

export type StockfishAnalysisNativeResult = {
  bestMove: string | null;
  mate: number | null;
  scoreCp: number | null;
};

export default requireOptionalNativeModule<StockfishEngineNativeModule>(
  'StockfishEngine',
);
