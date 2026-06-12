import type { Color, Square } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function getBoardSquares(flipped: boolean): Square[][] {
  const files = flipped ? [...FILES].reverse() : [...FILES];
  const ranks = flipped ? [...RANKS].reverse() : [...RANKS];

  return ranks.map((rank) =>
    files.map((file) => `${file}${rank}` as Square),
  );
}

export function isLightSquare(square: Square): boolean {
  const fileIndex = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]);

  return (fileIndex + rank) % 2 === 0;
}

export function shouldRotatePieceForFaceToFace(
  color: Color,
  flipped: boolean,
): boolean {
  return flipped ? color === 'w' : color === 'b';
}
