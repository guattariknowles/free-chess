import { Chess, type Move, type Square } from 'chess.js';

import type { EngineMove } from './ChessEngine';
import type { AiMoveConstraint } from '../game/localAi';
import type { LegalMove, PromotionPiece } from '../game/chessState';

const UCI_MOVE_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

function toLegalMove(move: Move): LegalMove {
  return {
    captured: move.captured,
    from: move.from,
    promotion: move.promotion as PromotionPiece | undefined,
    san: move.san,
    to: move.to,
  };
}

export function toUciMove(move: EngineMove): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function parseUciMove(value: string): EngineMove | null {
  const match = UCI_MOVE_PATTERN.exec(value.trim().toLowerCase());

  if (!match) {
    return null;
  }

  return {
    from: match[1] as Square,
    promotion: match[3] as PromotionPiece | undefined,
    to: match[2] as Square,
  };
}

export function resolveLegalEngineMove(
  fen: string,
  move: EngineMove,
  allowedMoves?: AiMoveConstraint[],
): LegalMove | null {
  if (
    allowedMoves &&
    !allowedMoves.some(
      (allowed) =>
        allowed.from === move.from &&
        allowed.to === move.to &&
        (allowed.promotion === undefined ||
          allowed.promotion === move.promotion),
    )
  ) {
    return null;
  }

  const chess = new Chess(fen);
  const legalMove = chess
    .moves({ square: move.from, verbose: true })
    .find(
      (candidate) =>
        candidate.to === move.to &&
        (candidate.promotion === undefined ||
          candidate.promotion === move.promotion),
    );

  return legalMove ? toLegalMove(legalMove) : null;
}
