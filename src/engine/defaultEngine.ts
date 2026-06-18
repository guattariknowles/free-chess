import { EngineManager } from './engineManager';
import { SimpleEngine } from './SimpleEngine';
import { StockfishEngine } from './StockfishEngine';

export const chessEngine = new EngineManager(
  new StockfishEngine(),
  new SimpleEngine(),
);
