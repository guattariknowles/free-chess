import { Chess } from 'chess.js';

import type {
  ChessEngine,
  EngineMove,
  EngineSearchOptions,
} from './ChessEngine';
import { EngineManager } from './engineManager';

declare const require: (id: string) => unknown;

type TestFunction = (
  name: string,
  callback: () => void | Promise<void>,
) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  match: (actual: string, expected: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

class FakeEngine implements ChessEngine {
  stopped = false;

  constructor(
    readonly provider: 'simple' | 'stockfish',
    private readonly move: EngineMove | null,
    private readonly available = true,
    private readonly error?: Error,
    private readonly delayMs = 0,
  ) {}

  async getBestMove(
    _fen: string,
    _options: EngineSearchOptions,
  ): Promise<EngineMove | null> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.error) {
      throw this.error;
    }

    return this.move;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }
}

const OPTIONS: EngineSearchOptions = {
  difficulty: 'intermediate',
};

test('engine manager uses a legal primary engine move', async () => {
  const manager = new EngineManager(
    new FakeEngine('stockfish', { from: 'e2', to: 'e4' }),
    new FakeEngine('simple', { from: 'd2', to: 'd4' }),
  );
  const result = await manager.getBestMove(new Chess().fen(), OPTIONS);

  assert.equal(result.provider, 'stockfish');
  assert.equal(result.move?.san, 'e4');
  assert.equal(result.fallbackReason, undefined);
});

test('engine manager falls back when Stockfish is unavailable', async () => {
  const primary = new FakeEngine(
    'stockfish',
    { from: 'e2', to: 'e4' },
    false,
  );
  const manager = new EngineManager(
    primary,
    new FakeEngine('simple', { from: 'd2', to: 'd4' }),
  );
  const result = await manager.getBestMove(new Chess().fen(), OPTIONS);

  assert.equal(result.provider, 'simple');
  assert.equal(result.move?.san, 'd4');
  assert.match(result.fallbackReason ?? '', /不可用/);
  assert.equal(primary.stopped, true);
});

test('engine manager rejects illegal primary moves and falls back', async () => {
  const manager = new EngineManager(
    new FakeEngine('stockfish', { from: 'e2', to: 'e5' }),
    new FakeEngine('simple', { from: 'g1', to: 'f3' }),
  );
  const result = await manager.getBestMove(new Chess().fen(), OPTIONS);

  assert.equal(result.provider, 'simple');
  assert.equal(result.move?.san, 'Nf3');
  assert.match(result.fallbackReason ?? '', /不符合当前局面/);
});

test('engine manager stops and falls back after a timeout', async () => {
  const primary = new FakeEngine(
    'stockfish',
    { from: 'e2', to: 'e4' },
    true,
    undefined,
    30,
  );
  const manager = new EngineManager(
    primary,
    new FakeEngine('simple', { from: 'c2', to: 'c4' }),
  );
  const result = await manager.getBestMove(new Chess().fen(), {
    ...OPTIONS,
    timeoutMs: 5,
  });

  assert.equal(result.provider, 'simple');
  assert.equal(result.move?.san, 'c4');
  assert.match(result.fallbackReason ?? '', /超时/);
  assert.equal(primary.stopped, true);
});
