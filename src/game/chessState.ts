import {
  Chess,
  type Color,
  type Move,
  type PieceSymbol,
  type Square,
} from 'chess.js';

export type PromotionPiece = Extract<PieceSymbol, 'q' | 'r' | 'b' | 'n'>;

export type BoardPiece = {
  color: Color;
  square: Square;
  type: PieceSymbol;
};

export type LegalMove = {
  captured?: PieceSymbol;
  from: Square;
  promotion?: PromotionPiece;
  san: string;
  to: Square;
};

export type DrawReason =
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'draw';

export type GameStatus = {
  drawReason?: DrawReason;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  message: string;
  turn: Color;
  winner?: Color;
};

export type GameSnapshot = {
  board: BoardPiece[];
  canUndo: boolean;
  fen: string;
  lastMove: LegalMove | null;
  moveCount: number;
  status: GameStatus;
};

export type ReplayPosition = {
  move: LegalMove | null;
  ply: number;
  snapshot: GameSnapshot;
};

export type MoveAttempt =
  | {
      move: LegalMove;
      snapshot: GameSnapshot;
      success: true;
    }
  | {
      reason: 'game_over' | 'illegal_move';
      snapshot: GameSnapshot;
      success: false;
    };

const COLOR_NAMES: Record<Color, string> = {
  b: '黑方',
  w: '白方',
};

function toLegalMove(move: Move): LegalMove {
  return {
    captured: move.captured,
    from: move.from,
    promotion: move.promotion as PromotionPiece | undefined,
    san: move.san,
    to: move.to,
  };
}

function getDrawReason(chess: Chess): DrawReason | undefined {
  if (chess.isStalemate()) {
    return 'stalemate';
  }

  if (chess.isInsufficientMaterial()) {
    return 'insufficient_material';
  }

  if (chess.isThreefoldRepetition()) {
    return 'threefold_repetition';
  }

  if (chess.isDrawByFiftyMoves()) {
    return 'fifty_move_rule';
  }

  if (chess.isDraw()) {
    return 'draw';
  }

  return undefined;
}

function getStatus(chess: Chess): GameStatus {
  const turn = chess.turn();
  const isCheckmate = chess.isCheckmate();
  const drawReason = getDrawReason(chess);
  const isDraw = drawReason !== undefined;
  const isCheck = chess.isCheck();
  const winner: Color | undefined = isCheckmate
    ? turn === 'w'
      ? 'b'
      : 'w'
    : undefined;

  let message = `${COLOR_NAMES[turn]}走棋`;

  if (isCheckmate && winner) {
    message = `将死，${COLOR_NAMES[winner]}获胜`;
  } else if (drawReason === 'stalemate') {
    message = '和棋：无子可动';
  } else if (drawReason === 'insufficient_material') {
    message = '和棋：子力不足';
  } else if (drawReason === 'threefold_repetition') {
    message = '和棋：三次重复局面';
  } else if (drawReason === 'fifty_move_rule') {
    message = '和棋：五十回合规则';
  } else if (isDraw) {
    message = '和棋';
  } else if (isCheck) {
    message = `${COLOR_NAMES[turn]}被将军`;
  }

  return {
    drawReason,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver: chess.isGameOver(),
    message,
    turn,
    winner,
  };
}

export class ChessGame {
  private readonly chess: Chess;
  private initialFen?: string;

  constructor(fen?: string) {
    this.initialFen = fen;
    this.chess = new Chess(fen);
  }

  getPiece(square: Square): BoardPiece | null {
    const piece = this.chess.get(square);

    return piece
      ? {
          color: piece.color,
          square,
          type: piece.type,
        }
      : null;
  }

  getLegalMoves(square: Square): LegalMove[] {
    if (this.chess.isGameOver()) {
      return [];
    }

    return this.chess
      .moves({ square, verbose: true })
      .map((move) => toLegalMove(move));
  }

  getSnapshot(): GameSnapshot {
    const history = this.chess.history({ verbose: true });
    const board = this.chess
      .board()
      .flat()
      .filter((piece): piece is NonNullable<typeof piece> => piece !== null)
      .map((piece) => ({
        color: piece.color,
        square: piece.square,
        type: piece.type,
      }));

    return {
      board,
      canUndo: history.length > 0,
      fen: this.chess.fen(),
      lastMove: history.length > 0 ? toLegalMove(history[history.length - 1]) : null,
      moveCount: history.length,
      status: getStatus(this.chess),
    };
  }

  getHeaders(): Record<string, string> {
    return this.chess.getHeaders();
  }

  getPgn(headers: Record<string, string> = {}): string {
    Object.entries(headers).forEach(([key, value]) => {
      this.chess.setHeader(key, value);
    });

    return this.chess.pgn({ maxWidth: 80, newline: '\n' });
  }

  getReplayPositions(): ReplayPosition[] {
    const history = this.chess.history({ verbose: true });
    const startingFen =
      history[0]?.before ?? this.initialFen ?? new Chess().fen();
    const replay = new ChessGame(startingFen);
    const positions: ReplayPosition[] = [
      {
        move: null,
        ply: 0,
        snapshot: replay.getSnapshot(),
      },
    ];

    history.forEach((move, index) => {
      const result = replay.move(
        move.from,
        move.to,
        move.promotion as PromotionPiece | undefined,
      );

      if (!result.success) {
        throw new Error(`无法回放第 ${index + 1} 步`);
      }

      positions.push({
        move: result.move,
        ply: index + 1,
        snapshot: result.snapshot,
      });
    });

    return positions;
  }

  loadPgn(pgn: string): GameSnapshot {
    this.chess.loadPgn(pgn);
    const history = this.chess.history({ verbose: true });

    this.initialFen = history[0]?.before ?? this.chess.fen();

    return this.getSnapshot();
  }

  move(
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ): MoveAttempt {
    if (this.chess.isGameOver()) {
      return {
        reason: 'game_over',
        snapshot: this.getSnapshot(),
        success: false,
      };
    }

    try {
      const move = this.chess.move({ from, promotion, to });

      return {
        move: toLegalMove(move),
        snapshot: this.getSnapshot(),
        success: true,
      };
    } catch {
      return {
        reason: 'illegal_move',
        snapshot: this.getSnapshot(),
        success: false,
      };
    }
  }

  reset(): GameSnapshot {
    if (this.initialFen) {
      this.chess.load(this.initialFen);
    } else {
      this.chess.reset();
    }

    return this.getSnapshot();
  }

  undo(): GameSnapshot {
    this.chess.undo();
    return this.getSnapshot();
  }
}
