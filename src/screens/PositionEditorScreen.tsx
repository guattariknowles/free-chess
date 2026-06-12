import * as Clipboard from 'expo-clipboard';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChessBoard } from '../components/Board/ChessBoard';
import {
  buildPositionFen,
  createCustomPosition,
  createEmptyPositionDraft,
  type CustomPosition,
  movePositionPiece,
  parsePositionFen,
  type PositionDraft,
  type PositionPieceChoice,
  setPositionPiece,
  STANDARD_START_FEN,
  validateCustomPosition,
  type PositionValidationIssue,
} from '../game/customPosition';
import {
  deleteCustomPosition,
  loadCustomPositions,
  saveCustomPosition,
} from '../game/customPositionStorage';

type PositionEditorScreenProps = {
  onBack: () => void;
  onStart: (fen: string) => void;
};

type EditorTool = 'erase' | 'move' | PositionPieceChoice;

const PIECE_CHOICES: Array<{
  color: Color;
  label: string;
  symbol: string;
  type: PieceSymbol;
}> = [
  { color: 'w', label: '白王', symbol: '♔', type: 'k' },
  { color: 'w', label: '白后', symbol: '♕', type: 'q' },
  { color: 'w', label: '白车', symbol: '♖', type: 'r' },
  { color: 'w', label: '白象', symbol: '♗', type: 'b' },
  { color: 'w', label: '白马', symbol: '♘', type: 'n' },
  { color: 'w', label: '白兵', symbol: '♙', type: 'p' },
  { color: 'b', label: '黑王', symbol: '♚', type: 'k' },
  { color: 'b', label: '黑后', symbol: '♛', type: 'q' },
  { color: 'b', label: '黑车', symbol: '♜', type: 'r' },
  { color: 'b', label: '黑象', symbol: '♝', type: 'b' },
  { color: 'b', label: '黑马', symbol: '♞', type: 'n' },
  { color: 'b', label: '黑兵', symbol: '♟', type: 'p' },
];

function isPieceTool(tool: EditorTool): tool is PositionPieceChoice {
  return typeof tool === 'object';
}

export function PositionEditorScreen({
  onBack,
  onStart,
}: PositionEditorScreenProps) {
  const [draft, setDraft] = useState<PositionDraft>(() =>
    parsePositionFen(STANDARD_START_FEN),
  );
  const [tool, setTool] = useState<EditorTool>('move');
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [fenInput, setFenInput] = useState(STANDARD_START_FEN);
  const [positionName, setPositionName] = useState('');
  const [saved, setSaved] = useState<CustomPosition[]>([]);
  const [feedback, setFeedback] = useState(
    '选择“移动”可搬动棋子，也可从下方直接摆子',
  );
  const [validationIssues, setValidationIssues] = useState<
    PositionValidationIssue[]
  >([]);
  const { height, width } = useWindowDimensions();
  const boardSize = Math.floor(
    Math.min(width - 24, Math.max(236, height - 560), 480),
  );
  const pieces = useMemo(
    () => new Map(draft.board.map((piece) => [piece.square, piece])),
    [draft.board],
  );

  useEffect(() => {
    loadCustomPositions()
      .then(setSaved)
      .catch(() => setFeedback('读取已保存局面失败'));
  }, []);

  const syncFen = (next: PositionDraft) => {
    setDraft(next);
    setFenInput(buildPositionFen(next));
    setValidationIssues([]);
  };

  const handleSquarePress = (square: Square) => {
    if (tool === 'erase') {
      syncFen(setPositionPiece(draft, square, null));
      setMoveFrom(null);
      setFeedback(`已清空 ${square}`);
      return;
    }

    if (isPieceTool(tool)) {
      syncFen(setPositionPiece(draft, square, tool));
      setMoveFrom(null);
      setFeedback(`已在 ${square} 放置棋子`);
      return;
    }

    if (!moveFrom) {
      if (!pieces.has(square)) {
        setFeedback('请先点击要移动的棋子');
        return;
      }

      setMoveFrom(square);
      setFeedback(`已选择 ${square}，请点击目标格`);
      return;
    }

    if (moveFrom === square) {
      setMoveFrom(null);
      setFeedback('已取消移动');
      return;
    }

    syncFen(movePositionPiece(draft, moveFrom, square));
    setMoveFrom(null);
    setFeedback(`棋子已移动到 ${square}`);
  };

  const applyFen = () => {
    try {
      const next = parsePositionFen(fenInput);
      setDraft(next);
      setMoveFrom(null);
      setValidationIssues([]);
      setFeedback('FEN 已导入');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '导入 FEN 失败');
    }
  };

  const getValidatedFen = (): string | null => {
    const result = validateCustomPosition(draft);

    if (!result.ok) {
      setValidationIssues(result.issues);
      setFeedback(
        result.type === 'TerminalStart'
          ? '该局面已经结束，请调整棋子后再开始普通对局'
          : `发现 ${result.issues.length} 个局面问题`,
      );
      return null;
    }

    setValidationIssues([]);
    setFenInput(result.fen);
    return result.fen;
  };

  const copyFen = async () => {
    const fen = getValidatedFen();

    if (!fen) {
      return;
    }

    await Clipboard.setStringAsync(fen);
    setFeedback('合法 FEN 已复制');
  };

  const savePosition = async () => {
    const fen = getValidatedFen();

    if (!fen) {
      return;
    }

    try {
      const position = createCustomPosition(positionName, fen);
      const next = await saveCustomPosition(position);
      setSaved(next);
      setPositionName('');
      setFeedback('自定义局面已保存到本机');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '保存局面失败');
    }
  };

  const startGame = () => {
    const fen = getValidatedFen();

    if (fen) {
      onStart(fen);
    }
  };

  const toggleCastling = (key: keyof PositionDraft['castling']) => {
    syncFen({
      ...draft,
      castling: {
        ...draft.castling,
        [key]: !draft.castling[key],
      },
    });
  };

  const loadSaved = (position: CustomPosition) => {
    try {
      const next = parsePositionFen(position.fen);
      setDraft(next);
      setFenInput(position.fen);
      setMoveFrom(null);
      setValidationIssues([]);
      setFeedback(`已载入“${position.name}”`);
    } catch {
      setFeedback('这个已保存局面无法读取');
    }
  };

  const confirmDelete = (position: CustomPosition) => {
    Alert.alert(`删除“${position.name}”？`, '删除后无法恢复。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: async () => {
          const next = await deleteCustomPosition(position.id);
          setSaved(next);
          setFeedback('自定义局面已删除');
        },
        style: 'destructive',
        text: '删除',
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>返回棋盘</Text>
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PART 4</Text>
            <Text style={styles.title}>自由局面</Text>
          </View>
          <Pressable onPress={startGame} style={styles.startButton}>
            <Text style={styles.startButtonText}>从此开局</Text>
          </Pressable>
        </View>

        <View style={styles.boardWrap}>
          <ChessBoard
            board={draft.board}
            flipped={false}
            highlightedSquares={validationIssues.flatMap(
              (issue) => issue.squares,
            )}
            lastMove={null}
            legalMoves={[]}
            onSquarePress={handleSquarePress}
            selectedSquare={moveFrom}
            size={boardSize}
          />
        </View>

        <View accessibilityLiveRegion="polite" style={styles.feedback}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
        {validationIssues.length > 0 ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorCard}>
            <Text style={styles.errorTitle}>局面不能保存或开始</Text>
            {validationIssues.map((issue, index) => (
              <Text key={`${issue.code}-${index}`} style={styles.errorText}>
                {index + 1}. {issue.message}
              </Text>
            ))}
            <Text style={styles.errorHint}>
              红框标出了相关棋子或格子。修改后可再次点击保存或从此开局。
            </Text>
          </View>
        ) : null}

        <View style={styles.toolRow}>
          <ToolButton
            active={tool === 'move'}
            label="移动"
            onPress={() => {
              setTool('move');
              setMoveFrom(null);
            }}
          />
          <ToolButton
            active={tool === 'erase'}
            label="橡皮"
            onPress={() => {
              setTool('erase');
              setMoveFrom(null);
            }}
          />
          <ToolButton
            label="标准开局"
            onPress={() => syncFen(parsePositionFen(STANDARD_START_FEN))}
          />
          <ToolButton
            label="清空"
            onPress={() => syncFen(createEmptyPositionDraft())}
          />
        </View>

        <View style={styles.palette}>
          {PIECE_CHOICES.map((piece) => {
            const active =
              isPieceTool(tool) &&
              tool.color === piece.color &&
              tool.type === piece.type;

            return (
              <Pressable
                accessibilityLabel={piece.label}
                key={`${piece.color}-${piece.type}`}
                onPress={() =>
                  setTool({ color: piece.color, type: piece.type })
                }
                style={[
                  styles.pieceButton,
                  active && styles.activePieceButton,
                ]}
              >
                <Text style={styles.pieceSymbol}>{piece.symbol}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.turnRow}>
            <Text style={styles.fieldLabel}>轮到</Text>
            <ChoiceButton
              active={draft.turn === 'w'}
              label="白方"
              onPress={() => syncFen({ ...draft, turn: 'w' })}
            />
            <ChoiceButton
              active={draft.turn === 'b'}
              label="黑方"
              onPress={() => syncFen({ ...draft, turn: 'b' })}
            />
          </View>
          <Text style={styles.fieldLabel}>王车易位权利</Text>
          <View style={styles.castlingRow}>
            <ChoiceButton
              active={draft.castling.whiteKingSide}
              label="白王侧 K"
              onPress={() => toggleCastling('whiteKingSide')}
            />
            <ChoiceButton
              active={draft.castling.whiteQueenSide}
              label="白后侧 Q"
              onPress={() => toggleCastling('whiteQueenSide')}
            />
            <ChoiceButton
              active={draft.castling.blackKingSide}
              label="黑王侧 k"
              onPress={() => toggleCastling('blackKingSide')}
            />
            <ChoiceButton
              active={draft.castling.blackQueenSide}
              label="黑后侧 q"
              onPress={() => toggleCastling('blackQueenSide')}
            />
          </View>
          <View style={styles.numberRow}>
            <SmallField
              label="吃过路兵格"
              onChangeText={(value) =>
                syncFen({
                  ...draft,
                  enPassant:
                    value.trim() === '-' || value.trim() === ''
                      ? null
                      : (value.trim().toLowerCase() as Square),
                })
              }
              value={draft.enPassant ?? '-'}
            />
            <SmallField
              keyboardType="number-pad"
              label="半回合"
              onChangeText={(value) =>
                syncFen({
                  ...draft,
                  halfmoveClock: Number(value) || 0,
                })
              }
              value={String(draft.halfmoveClock)}
            />
            <SmallField
              keyboardType="number-pad"
              label="回合数"
              onChangeText={(value) =>
                syncFen({
                  ...draft,
                  fullmoveNumber: Number(value) || 1,
                })
              }
              value={String(draft.fullmoveNumber)}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>FEN 导入与导出</Text>
        <TextInput
          accessibilityLabel="FEN 内容"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={setFenInput}
          style={styles.fenInput}
          value={fenInput}
        />
        <View style={styles.actionRow}>
          <ToolButton label="导入 FEN" onPress={applyFen} />
          <ToolButton label="复制 FEN" onPress={copyFen} />
        </View>

        <Text style={styles.sectionTitle}>保存此局面</Text>
        <View style={styles.saveRow}>
          <TextInput
            maxLength={32}
            onChangeText={setPositionName}
            placeholder="局面名称"
            placeholderTextColor="#687068"
            style={styles.nameInput}
            value={positionName}
          />
          <Pressable onPress={savePosition} style={styles.startButton}>
            <Text style={styles.startButtonText}>保存</Text>
          </Pressable>
        </View>

        {saved.map((position) => (
          <View key={position.id} style={styles.savedCard}>
            <Pressable
              onPress={() => loadSaved(position)}
              style={styles.savedMain}
            >
              <Text style={styles.savedTitle}>{position.name}</Text>
              <Text numberOfLines={1} style={styles.savedFen}>
                {position.fen}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(position)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>删除</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

type ToolButtonProps = {
  active?: boolean;
  label: string;
  onPress: () => void;
};

function ToolButton({
  active = false,
  label,
  onPress,
}: ToolButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.toolButton, active && styles.activeToolButton]}
    >
      <Text style={styles.toolButtonText}>{label}</Text>
    </Pressable>
  );
}

function ChoiceButton({
  active,
  label,
  onPress,
}: ToolButtonProps & { active: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choiceButton, active && styles.activeChoiceButton]}
    >
      <Text
        style={[
          styles.choiceText,
          active && styles.activeChoiceText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SmallFieldProps = {
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
};

function SmallField({
  keyboardType = 'default',
  label,
  onChangeText,
  value,
}: SmallFieldProps) {
  return (
    <View style={styles.smallField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.smallInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#171a18',
    flex: 1,
  },
  content: {
    paddingBottom: 30,
    paddingHorizontal: 12,
    paddingTop: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  heading: {
    flex: 1,
    marginHorizontal: 10,
  },
  eyebrow: {
    color: '#d49a43',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  title: {
    color: '#f4f1e8',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  headerButtonText: {
    color: '#e5e2d9',
    fontSize: 11,
    fontWeight: '700',
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  startButtonText: {
    color: '#fff7e8',
    fontSize: 12,
    fontWeight: '800',
  },
  boardWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  feedback: {
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 9,
    borderWidth: 1,
    padding: 9,
  },
  feedbackText: {
    color: '#b8bfb6',
    fontSize: 11,
  },
  errorCard: {
    backgroundColor: '#3a2420',
    borderColor: '#a64f42',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  errorTitle: {
    color: '#ffd6cf',
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: '#f3b4aa',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  errorHint: {
    color: '#c98d84',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  toolButton: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 4,
  },
  activeToolButton: {
    borderColor: '#d49a43',
  },
  toolButtonText: {
    color: '#efede4',
    fontSize: 11,
    fontWeight: '700',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  pieceButton: {
    alignItems: 'center',
    backgroundColor: '#d9d1ba',
    borderColor: '#4c554b',
    borderRadius: 7,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: '15.2%',
  },
  activePieceButton: {
    borderColor: '#f1aa3c',
  },
  pieceSymbol: {
    color: '#20241f',
    fontFamily: 'serif',
    fontSize: 29,
  },
  settingsCard: {
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 9,
    padding: 10,
  },
  turnRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 9,
  },
  fieldLabel: {
    color: '#9ca49a',
    fontSize: 10,
    marginBottom: 4,
  },
  castlingRow: {
    flexDirection: 'row',
    gap: 5,
  },
  choiceButton: {
    alignItems: 'center',
    borderColor: '#454d45',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  activeChoiceButton: {
    backgroundColor: '#8c6230',
    borderColor: '#d49a43',
  },
  choiceText: {
    color: '#abb2a9',
    fontSize: 10,
    fontWeight: '700',
  },
  activeChoiceText: {
    color: '#fff5e5',
  },
  numberRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  smallField: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#171a18',
    borderColor: '#454d45',
    borderRadius: 7,
    borderWidth: 1,
    color: '#f4f1e8',
    fontSize: 12,
    minHeight: 38,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#e7e4db',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 16,
  },
  fenInput: {
    backgroundColor: '#202420',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f4f1e8',
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 7,
    minHeight: 64,
    padding: 9,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 7,
  },
  nameInput: {
    backgroundColor: '#202420',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f4f1e8',
    flex: 1,
    paddingHorizontal: 10,
  },
  savedCard: {
    alignItems: 'center',
    backgroundColor: '#242924',
    borderColor: '#3e453e',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 7,
  },
  savedMain: {
    flex: 1,
    padding: 10,
  },
  savedTitle: {
    color: '#f2efe6',
    fontSize: 13,
    fontWeight: '800',
  },
  savedFen: {
    color: '#7f887e',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 3,
  },
  deleteButton: {
    padding: 12,
  },
  deleteText: {
    color: '#e98576',
    fontSize: 11,
    fontWeight: '700',
  },
});
