import type {
  ChessEngine,
  EngineSearchOptions,
  EngineSearchResult,
} from './ChessEngine';
import { resolveLegalEngineMove } from './uci';

const DEFAULT_TIMEOUT_MS = 2_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '本地引擎发生未知错误';
}

export class EngineManager {
  constructor(
    private readonly primary: ChessEngine,
    private readonly fallback: ChessEngine,
  ) {}

  async getBestMove(
    fen: string,
    options: EngineSearchOptions,
  ): Promise<EngineSearchResult> {
    try {
      if (!(await this.primary.isAvailable())) {
        throw new Error('Stockfish 当前不可用');
      }

      const move = await this.withTimeout(
        this.primary.getBestMove(fen, options),
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
      const legalMove = move
        ? resolveLegalEngineMove(fen, move, options.allowedMoves)
        : null;

      if (move && !legalMove) {
        throw new Error('Stockfish 返回了不符合当前局面的走法');
      }

      return {
        move: legalMove,
        provider: this.primary.provider,
      };
    } catch (error) {
      await this.primary.stop().catch(() => undefined);
      const fallbackMove = await this.fallback.getBestMove(fen, options);
      const legalFallback = fallbackMove
        ? resolveLegalEngineMove(
            fen,
            fallbackMove,
            options.allowedMoves,
          )
        : null;

      return {
        fallbackReason: getErrorMessage(error),
        move: legalFallback,
        provider: this.fallback.provider,
      };
    }
  }

  async stop(): Promise<void> {
    await Promise.allSettled([
      this.primary.stop(),
      this.fallback.stop(),
    ]);
  }

  private async withTimeout<T>(
    task: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        task,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Stockfish 计算超时')),
            Math.max(1, timeoutMs),
          );
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
