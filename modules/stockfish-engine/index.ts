import { requireOptionalNativeModule } from 'expo-modules-core';

export type StockfishEngineNativeModule = {
  getBestMove(
    fen: string,
    skillLevel: number,
    moveTimeMs: number,
    allowedMoves: string[],
  ): Promise<string | null>;
  isAvailable(): Promise<boolean>;
  stop(): Promise<void>;
};

export default requireOptionalNativeModule<StockfishEngineNativeModule>(
  'StockfishEngine',
);
