import {
  Chess,
  type Color,
  type PieceSymbol,
  type Square,
} from 'chess.js';

import type { BoardPiece } from './chessState';

export type CastlingRights = {
  blackKingSide: boolean;
  blackQueenSide: boolean;
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
};

export type PositionDraft = {
  board: BoardPiece[];
  castling: CastlingRights;
  enPassant: Square | null;
  fullmoveNumber: number;
  halfmoveClock: number;
  turn: Color;
};

export type CustomPosition = {
  createdAt: string;
  fen: string;
  id: string;
  name: string;
  updatedAt: string;
};

export type PositionValidationIssue = {
  code:
    | 'adjacent_kings'
    | 'both_kings_in_check'
    | 'castling_rights'
    | 'invalid_en_passant'
    | 'invalid_fen'
    | 'king_count'
    | 'non_moving_king_in_check'
    | 'pawn_count'
    | 'pawn_rank'
    | 'piece_count'
    | 'terminal_position';
  message: string;
  squares: Square[];
};

export type PositionValidationResult =
  | {
      fen: string;
      issues: [];
      ok: true;
      type: 'ValidStart';
    }
  | {
      issues: PositionValidationIssue[];
      ok: false;
      terminal?: 'checkmate' | 'draw' | 'stalemate';
      type: 'InvalidPosition' | 'TerminalStart';
    };

export const STANDARD_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function createId(now: string): string {
  return `position-${Date.parse(now)}-${Math.random().toString(36).slice(2, 9)}`;
}

function pieceToFen(piece: BoardPiece): string {
  return piece.color === 'w'
    ? piece.type.toUpperCase()
    : piece.type;
}

function getCastlingField(castling: CastlingRights): string {
  const value = [
    castling.whiteKingSide ? 'K' : '',
    castling.whiteQueenSide ? 'Q' : '',
    castling.blackKingSide ? 'k' : '',
    castling.blackQueenSide ? 'q' : '',
  ].join('');

  return value || '-';
}

export function createEmptyPositionDraft(): PositionDraft {
  return {
    board: [],
    castling: {
      blackKingSide: false,
      blackQueenSide: false,
      whiteKingSide: false,
      whiteQueenSide: false,
    },
    enPassant: null,
    fullmoveNumber: 1,
    halfmoveClock: 0,
    turn: 'w',
  };
}

export function parsePositionFen(fen: string): PositionDraft {
  const normalizedFen = fen.trim();
  let chess: Chess;

  try {
    chess = new Chess(normalizedFen);
  } catch {
    throw new Error('FEN 无法读取，请检查六个字段和棋子位置');
  }

  const fields = normalizedFen.split(/\s+/);
  const castlingField = fields[2] ?? '-';
  const enPassantField = fields[3] ?? '-';
  const halfmoveClock = Number(fields[4] ?? 0);
  const fullmoveNumber = Number(fields[5] ?? 1);

  return {
    board: chess
      .board()
      .flat()
      .filter((piece): piece is NonNullable<typeof piece> => piece !== null)
      .map((piece) => ({
        color: piece.color,
        square: piece.square,
        type: piece.type,
      })),
    castling: {
      blackKingSide: castlingField.includes('k'),
      blackQueenSide: castlingField.includes('q'),
      whiteKingSide: castlingField.includes('K'),
      whiteQueenSide: castlingField.includes('Q'),
    },
    enPassant:
      enPassantField === '-' ? null : (enPassantField as Square),
    fullmoveNumber,
    halfmoveClock,
    turn: chess.turn(),
  };
}

export function buildPositionFen(draft: PositionDraft): string {
  const pieces = new Map(
    draft.board.map((piece) => [piece.square, piece]),
  );
  const rows = RANKS.map((rank) => {
    let emptyCount = 0;
    let row = '';

    FILES.forEach((file) => {
      const square = `${file}${rank}` as Square;
      const piece = pieces.get(square);

      if (!piece) {
        emptyCount += 1;
        return;
      }

      if (emptyCount > 0) {
        row += String(emptyCount);
        emptyCount = 0;
      }

      row += pieceToFen(piece);
    });

    if (emptyCount > 0) {
      row += String(emptyCount);
    }

    return row;
  });

  return [
    rows.join('/'),
    draft.turn,
    getCastlingField(draft.castling),
    draft.enPassant ?? '-',
    Math.max(0, Math.floor(draft.halfmoveClock)),
    Math.max(1, Math.floor(draft.fullmoveNumber)),
  ].join(' ');
}

function kingsAreAdjacent(board: BoardPiece[]): boolean {
  const kings = board.filter((piece) => piece.type === 'k');

  if (kings.length !== 2) {
    return false;
  }

  const [first, second] = kings;
  const fileDistance = Math.abs(
    first.square.charCodeAt(0) - second.square.charCodeAt(0),
  );
  const rankDistance = Math.abs(
    Number(first.square[1]) - Number(second.square[1]),
  );

  return fileDistance <= 1 && rankDistance <= 1;
}

function uniqueSquares(squares: Square[]): Square[] {
  return [...new Set(squares)];
}

export function validateCustomPosition(
  draft: PositionDraft,
): PositionValidationResult {
  const issues: PositionValidationIssue[] = [];
  const whiteKings = draft.board.filter(
    (piece) => piece.color === 'w' && piece.type === 'k',
  );
  const blackKings = draft.board.filter(
    (piece) => piece.color === 'b' && piece.type === 'k',
  );

  if (whiteKings.length !== 1) {
    issues.push({
      code: 'king_count',
      message: '白王数量必须为 1',
      squares: whiteKings.map((piece) => piece.square),
    });
  }

  if (blackKings.length !== 1) {
    issues.push({
      code: 'king_count',
      message: '黑王数量必须为 1',
      squares: blackKings.map((piece) => piece.square),
    });
  }

  const invalidPawns = draft.board.filter(
    (piece) =>
      piece.type === 'p' &&
      (piece.square[1] === '1' || piece.square[1] === '8'),
  );

  if (invalidPawns.length > 0) {
    issues.push({
      code: 'pawn_rank',
      message: '兵不能放在第一横线或第八横线',
      squares: invalidPawns.map((piece) => piece.square),
    });
  }

  if (kingsAreAdjacent(draft.board)) {
    issues.push({
      code: 'adjacent_kings',
      message: '双方王不能相邻',
      squares: [...whiteKings, ...blackKings].map(
        (piece) => piece.square,
      ),
    });
  }

  if (draft.board.length > 32) {
    issues.push({
      code: 'piece_count',
      message: '棋子总数不能超过 32 个',
      squares: draft.board.map((piece) => piece.square),
    });
  }

  for (const color of ['w', 'b'] as const) {
    const colorName = color === 'w' ? '白方' : '黑方';
    const pieces = draft.board.filter((piece) => piece.color === color);
    const pawns = pieces.filter((piece) => piece.type === 'p');

    if (pieces.length > 16) {
      issues.push({
        code: 'piece_count',
        message: `${colorName}不能超过 16 个棋子`,
        squares: pieces.map((piece) => piece.square),
      });
    }

    if (pawns.length > 8) {
      issues.push({
        code: 'pawn_count',
        message: `${colorName}不能超过 8 个兵`,
        squares: pawns.map((piece) => piece.square),
      });
    }
  }

  const hasPiece = (
    square: Square,
    color: Color,
    type: PieceSymbol,
  ) =>
    draft.board.some(
      (piece) =>
        piece.square === square &&
        piece.color === color &&
        piece.type === type,
    );

  if (
    draft.castling.whiteKingSide &&
    (!hasPiece('e1', 'w', 'k') || !hasPiece('h1', 'w', 'r'))
  ) {
    issues.push({
      code: 'castling_rights',
      message: '白方王侧易位权利需要白王在 e1、白车在 h1',
      squares: ['e1', 'h1'],
    });
  }

  if (
    draft.castling.whiteQueenSide &&
    (!hasPiece('e1', 'w', 'k') || !hasPiece('a1', 'w', 'r'))
  ) {
    issues.push({
      code: 'castling_rights',
      message: '白方后侧易位权利需要白王在 e1、白车在 a1',
      squares: ['e1', 'a1'],
    });
  }

  if (
    draft.castling.blackKingSide &&
    (!hasPiece('e8', 'b', 'k') || !hasPiece('h8', 'b', 'r'))
  ) {
    issues.push({
      code: 'castling_rights',
      message: '黑方王侧易位权利需要黑王在 e8、黑车在 h8',
      squares: ['e8', 'h8'],
    });
  }

  if (
    draft.castling.blackQueenSide &&
    (!hasPiece('e8', 'b', 'k') || !hasPiece('a8', 'b', 'r'))
  ) {
    issues.push({
      code: 'castling_rights',
      message: '黑方后侧易位权利需要黑王在 e8、黑车在 a8',
      squares: ['e8', 'a8'],
    });
  }

  if (
    draft.enPassant &&
    ((draft.turn === 'w' && draft.enPassant[1] !== '6') ||
      (draft.turn === 'b' && draft.enPassant[1] !== '3'))
  ) {
    issues.push({
      code: 'invalid_en_passant',
      message: '吃过路兵目标格与当前走棋方不一致',
      squares: [draft.enPassant],
    });
  }

  if (issues.length > 0) {
    return {
      issues: issues.map((issue) => ({
        ...issue,
        squares: uniqueSquares(issue.squares),
      })),
      ok: false,
      type: 'InvalidPosition',
    };
  }

  const fen = buildPositionFen(draft);
  let chess: Chess;

  try {
    chess = new Chess(fen);
  } catch {
    return {
      issues: [
        {
          code: 'invalid_fen',
          message: '当前设置不是可进入标准对局的合法 FEN',
          squares: [],
        },
      ],
      ok: false,
      type: 'InvalidPosition',
    };
  }

  const whiteKingSquare = whiteKings[0].square;
  const blackKingSquare = blackKings[0].square;
  const whiteAttackers = chess.attackers(whiteKingSquare, 'b');
  const blackAttackers = chess.attackers(blackKingSquare, 'w');
  const whiteInCheck = whiteAttackers.length > 0;
  const blackInCheck = blackAttackers.length > 0;

  if (whiteInCheck && blackInCheck) {
    return {
      issues: [
        {
          code: 'both_kings_in_check',
          message: '双方不能同时被将军',
          squares: uniqueSquares([
            whiteKingSquare,
            blackKingSquare,
            ...whiteAttackers,
            ...blackAttackers,
          ]),
        },
      ],
      ok: false,
      type: 'InvalidPosition',
    };
  }

  const nonMovingKingInCheck =
    (draft.turn === 'w' && blackInCheck) ||
    (draft.turn === 'b' && whiteInCheck);

  if (nonMovingKingInCheck) {
    const kingSquare =
      draft.turn === 'w' ? blackKingSquare : whiteKingSquare;
    const attackers =
      draft.turn === 'w' ? blackAttackers : whiteAttackers;
    const sideToMove = draft.turn === 'w' ? '白方' : '黑方';
    const checkedSide = draft.turn === 'w' ? '黑王' : '白王';

    return {
      issues: [
        {
          code: 'non_moving_king_in_check',
          message: `当前轮到${sideToMove}走，但${checkedSide}正被将军`,
          squares: uniqueSquares([kingSquare, ...attackers]),
        },
      ],
      ok: false,
      type: 'InvalidPosition',
    };
  }

  if (chess.isCheckmate() || chess.isStalemate() || chess.isGameOver()) {
    const terminal = chess.isCheckmate()
      ? 'checkmate'
      : chess.isStalemate()
        ? 'stalemate'
        : 'draw';
    const message =
      terminal === 'checkmate'
        ? '该自定义局面已经是将死，不能作为普通对局起点'
        : terminal === 'stalemate'
          ? '该自定义局面已经是逼和，不能作为普通对局起点'
          : '该自定义局面已经是和棋终局，不能作为普通对局起点';
    const currentKing =
      draft.turn === 'w' ? whiteKingSquare : blackKingSquare;
    const attackers =
      draft.turn === 'w' ? whiteAttackers : blackAttackers;

    return {
      issues: [
        {
          code: 'terminal_position',
          message,
          squares: uniqueSquares([currentKing, ...attackers]),
        },
      ],
      ok: false,
      terminal,
      type: 'TerminalStart',
    };
  }

  return {
    fen,
    issues: [],
    ok: true,
    type: 'ValidStart',
  };
}

export function validatePositionDraft(draft: PositionDraft): string {
  const result = validateCustomPosition(draft);

  if (!result.ok) {
    throw new Error(result.issues.map((issue) => issue.message).join('；'));
  }

  return result.fen;
}

export function setPositionPiece(
  draft: PositionDraft,
  square: Square,
  piece: Pick<BoardPiece, 'color' | 'type'> | null,
): PositionDraft {
  const board = draft.board.filter((item) => item.square !== square);

  if (piece) {
    board.push({ ...piece, square });
  }

  return { ...draft, board };
}

export function movePositionPiece(
  draft: PositionDraft,
  from: Square,
  to: Square,
): PositionDraft {
  const piece = draft.board.find((item) => item.square === from);

  if (!piece) {
    return draft;
  }

  return setPositionPiece(
    setPositionPiece(draft, from, null),
    to,
    piece,
  );
}

export function createCustomPosition(
  name: string,
  fen: string,
  createdAt = new Date().toISOString(),
  id?: string,
): CustomPosition {
  const normalizedName = name.trim().replace(/\s+/g, ' ');

  if (!normalizedName) {
    throw new Error('局面名称不能为空');
  }

  if (normalizedName.length > 32) {
    throw new Error('局面名称最多 32 个字符');
  }

  validatePositionDraft(parsePositionFen(fen));

  return {
    createdAt,
    fen: fen.trim(),
    id: id ?? createId(createdAt),
    name: normalizedName,
    updatedAt: new Date().toISOString(),
  };
}

export function isCustomPosition(value: unknown): value is CustomPosition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const position = value as Partial<CustomPosition>;

  return (
    typeof position.id === 'string' &&
    typeof position.name === 'string' &&
    typeof position.fen === 'string' &&
    typeof position.createdAt === 'string' &&
    typeof position.updatedAt === 'string'
  );
}

export type PositionPieceChoice = {
  color: Color;
  type: PieceSymbol;
};
