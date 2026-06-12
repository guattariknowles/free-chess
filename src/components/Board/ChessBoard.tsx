import type { Color, PieceSymbol, Square } from 'chess.js';
import { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import type { BoardPiece, LegalMove } from '../../game/chessState';
import { getBoardSquares, isLightSquare } from './boardCoordinates';

type ChessBoardProps = {
  board: BoardPiece[];
  flipped: boolean;
  highlightedSquares?: Square[];
  lastMove: LegalMove | null;
  legalMoves: LegalMove[];
  onSquarePress: (square: Square) => void;
  selectedSquare: Square | null;
  size: number;
};

const PIECES: Record<Color, Record<PieceSymbol, string>> = {
  b: {
    b: '♝',
    k: '♚',
    n: '♞',
    p: '♟',
    q: '♛',
    r: '♜',
  },
  w: {
    b: '♗',
    k: '♔',
    n: '♘',
    p: '♙',
    q: '♕',
    r: '♖',
  },
};

function ChessBoardComponent({
  board,
  flipped,
  highlightedSquares = [],
  lastMove,
  legalMoves,
  onSquarePress,
  selectedSquare,
  size,
}: ChessBoardProps) {
  const squares = useMemo(() => getBoardSquares(flipped), [flipped]);
  const pieces = useMemo(
    () => new Map(board.map((piece) => [piece.square, piece])),
    [board],
  );
  const targetMoves = useMemo(
    () => new Map(legalMoves.map((move) => [move.to, move])),
    [legalMoves],
  );
  const highlighted = useMemo(
    () => new Set(highlightedSquares),
    [highlightedSquares],
  );
  const cellSize = size / 8;

  return (
    <View
      accessibilityLabel="国际象棋棋盘"
      style={[styles.board, { height: size, width: size }]}
    >
      {squares.map((rank, rowIndex) => (
        <View key={rank[0][1]} style={styles.row}>
          {rank.map((square, columnIndex) => {
            const piece = pieces.get(square);
            const legalMove = targetMoves.get(square);
            const selected = selectedSquare === square;
            const isLastMove =
              lastMove?.from === square || lastMove?.to === square;
            const squareStyle: ViewStyle[] = [
              styles.square,
              {
                backgroundColor: isLightSquare(square)
                  ? '#e7dfc8'
                  : '#78906a',
                height: cellSize,
                width: cellSize,
              },
            ];

            if (isLastMove) {
              squareStyle.push(styles.lastMoveSquare);
            }

            if (selected) {
              squareStyle.push(styles.selectedSquare);
            }

            if (highlighted.has(square)) {
              squareStyle.push(styles.problemSquare);
            }

            return (
              <Pressable
                accessibilityHint={
                  legalMove ? '走到这个格子' : '选择这个格子'
                }
                accessibilityLabel={`${square}${piece ? `，${piece.color === 'w' ? '白方' : '黑方'}棋子` : '，空格'}`}
                accessibilityRole="button"
                key={square}
                onPress={() => onSquarePress(square)}
                style={squareStyle}
              >
                {columnIndex === 0 ? (
                  <Text
                    pointerEvents="none"
                    style={[
                      styles.rankLabel,
                      isLightSquare(square)
                        ? styles.darkCoordinate
                        : styles.lightCoordinate,
                    ]}
                  >
                    {square[1]}
                  </Text>
                ) : null}

                {rowIndex === 7 ? (
                  <Text
                    pointerEvents="none"
                    style={[
                      styles.fileLabel,
                      isLightSquare(square)
                        ? styles.darkCoordinate
                        : styles.lightCoordinate,
                    ]}
                  >
                    {square[0]}
                  </Text>
                ) : null}

                {piece ? (
                  <Text
                    maxFontSizeMultiplier={1}
                    pointerEvents="none"
                    style={[
                      styles.piece,
                      {
                        fontSize: cellSize * 0.76,
                        lineHeight: cellSize * 0.9,
                      },
                      piece.color === 'w'
                        ? styles.whitePiece
                        : styles.blackPiece,
                    ]}
                  >
                    {PIECES[piece.color][piece.type]}
                  </Text>
                ) : null}

                {legalMove ? (
                  <View
                    pointerEvents="none"
                    style={
                      legalMove.captured
                        ? styles.captureTarget
                        : styles.moveTarget
                    }
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export const ChessBoard = memo(ChessBoardComponent);

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    backgroundColor: '#111411',
    borderColor: '#393f39',
    borderRadius: 4,
    borderWidth: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSquare: {
    borderColor: '#f1aa3c',
    borderWidth: 4,
  },
  problemSquare: {
    borderColor: '#ef725f',
    borderWidth: 4,
  },
  lastMoveSquare: {
    backgroundColor: '#b9a852',
  },
  piece: {
    fontFamily: 'serif',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  whitePiece: {
    color: '#fffdf3',
    textShadowColor: '#1f241f',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#20241f',
    textShadowColor: '#eef0e7',
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 1,
  },
  moveTarget: {
    backgroundColor: 'rgba(24, 43, 27, 0.45)',
    borderRadius: 999,
    height: '28%',
    position: 'absolute',
    width: '28%',
  },
  captureTarget: {
    borderColor: 'rgba(126, 48, 39, 0.7)',
    borderRadius: 999,
    borderWidth: 5,
    height: '84%',
    position: 'absolute',
    width: '84%',
  },
  rankLabel: {
    fontSize: 10,
    fontWeight: '700',
    left: 3,
    position: 'absolute',
    top: 2,
  },
  fileLabel: {
    bottom: 1,
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    right: 3,
  },
  darkCoordinate: {
    color: '#506046',
  },
  lightCoordinate: {
    color: '#edf0df',
  },
});
