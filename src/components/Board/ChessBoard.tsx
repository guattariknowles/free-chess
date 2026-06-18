import type { Square } from 'chess.js';
import { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import type { BoardPiece, LegalMove } from '../../game/chessState';
import { useTheme } from '../../theme';
import {
  getBoardSquares,
  isLightSquare,
  shouldRotatePieceForFaceToFace,
} from './boardCoordinates';

type ChessBoardProps = {
  board: BoardPiece[];
  faceToFacePieces?: boolean;
  flipped: boolean;
  highlightedSquares?: Square[];
  lastMove: LegalMove | null;
  legalMoves: LegalMove[];
  onSquarePress: (square: Square) => void;
  selectedSquare: Square | null;
  size: number;
};

function ChessBoardComponent({
  board,
  faceToFacePieces = false,
  flipped,
  highlightedSquares = [],
  lastMove,
  legalMoves,
  onSquarePress,
  selectedSquare,
  size,
}: ChessBoardProps) {
  const { boardSkin, pieceSkin } = useTheme();
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
      style={[
        styles.board,
        {
          backgroundColor: boardSkin.border,
          borderColor: boardSkin.border,
          height: size,
          width: size,
        },
      ]}
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
                  ? boardSkin.lightSquare
                  : boardSkin.darkSquare,
                height: cellSize,
                width: cellSize,
              },
            ];

            if (isLastMove) {
              squareStyle.push({ backgroundColor: boardSkin.lastMove });
            }

            if (selected) {
              squareStyle.push({
                borderColor: boardSkin.selected,
                borderWidth: 4,
              });
            }

            if (highlighted.has(square)) {
              squareStyle.push({
                borderColor: boardSkin.problem,
                borderWidth: 4,
              });
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
                      {
                        color: isLightSquare(square)
                          ? boardSkin.coordinateDark
                          : boardSkin.coordinateLight,
                      },
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
                      {
                        color: isLightSquare(square)
                          ? boardSkin.coordinateDark
                          : boardSkin.coordinateLight,
                      },
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
                        fontFamily: pieceSkin.family,
                        fontSize: cellSize * 0.76,
                        lineHeight: cellSize * 0.9,
                      },
                      piece.color === 'w'
                        ? {
                            color: pieceSkin.white,
                            textShadowColor: pieceSkin.whiteShadow,
                            textShadowOffset: { height: 1, width: 0 },
                            textShadowRadius: 2,
                          }
                        : {
                            color: pieceSkin.black,
                            textShadowColor: pieceSkin.blackShadow,
                            textShadowOffset: { height: 0, width: 0 },
                            textShadowRadius: 1,
                          },
                      faceToFacePieces &&
                        shouldRotatePieceForFaceToFace(
                          piece.color,
                          flipped,
                        ) &&
                        styles.facingAwayPiece,
                    ]}
                  >
                    {pieceSkin.symbols[piece.color][piece.type]}
                  </Text>
                ) : null}

                {legalMove ? (
                  <View
                    pointerEvents="none"
                    style={[
                      legalMove.captured
                        ? styles.captureTarget
                        : styles.moveTarget,
                      legalMove.captured
                        ? { borderColor: boardSkin.captureTarget }
                        : { backgroundColor: boardSkin.moveTarget },
                    ]}
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
  piece: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  facingAwayPiece: {
    transform: [{ rotate: '180deg' }],
  },
  moveTarget: {
    borderRadius: 999,
    height: '28%',
    position: 'absolute',
    width: '28%',
  },
  captureTarget: {
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
});
