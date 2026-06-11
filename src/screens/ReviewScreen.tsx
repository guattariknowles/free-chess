import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChessBoard } from '../components/Board/ChessBoard';
import {
  type GameRecord,
  getReplayPositions,
  getResultLabel,
} from '../game/gameRecord';

type ReviewScreenProps = {
  onBack: () => void;
  onRestart: () => void;
  record: GameRecord;
};

export function ReviewScreen({
  onBack,
  onRestart,
  record,
}: ReviewScreenProps) {
  const positions = useMemo(() => getReplayPositions(record), [record]);
  const [index, setIndex] = useState(positions.length - 1);
  const [flipped, setFlipped] = useState(false);
  const [feedback, setFeedback] = useState('使用按钮逐步查看棋局');
  const { height, width } = useWindowDimensions();
  const boardSize = Math.floor(
    Math.min(width - 24, Math.max(236, height - 330), 540),
  );
  const position = positions[index];
  const moveLabel =
    position.move === null
      ? '初始局面'
      : `第 ${Math.ceil(index / 2)} 回合${
          index % 2 === 1 ? '，白方' : '，黑方'
        } ${position.move.san}`;

  const copyPgn = async () => {
    await Clipboard.setStringAsync(record.pgn);
    setFeedback('PGN 已复制到剪贴板');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>返回</Text>
          </Pressable>
          <View style={styles.heading}>
            <Text numberOfLines={1} style={styles.title}>
              {record.title}
            </Text>
            <Text style={styles.subtitle}>
              {getResultLabel(record.result)} · {record.moveCount} 步
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={copyPgn}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>复制 PGN</Text>
          </Pressable>
        </View>

        <View style={styles.boardWrap}>
          <ChessBoard
            board={position.snapshot.board}
            flipped={flipped}
            lastMove={position.snapshot.lastMove}
            legalMoves={[]}
            onSquarePress={() => undefined}
            selectedSquare={null}
            size={boardSize}
          />
        </View>

        <View accessibilityLiveRegion="polite" style={styles.moveCard}>
          <Text style={styles.moveLabel}>{moveLabel}</Text>
          <Text style={styles.progress}>
            第 {index} / {positions.length - 1} 步
          </Text>
          <Text style={styles.feedback}>{feedback}</Text>
        </View>

        <View style={styles.navigation}>
          <ReviewButton
            disabled={index === 0}
            label="到开头"
            onPress={() => setIndex(0)}
          />
          <ReviewButton
            disabled={index === 0}
            label="上一步"
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
          />
          <ReviewButton
            disabled={index === positions.length - 1}
            label="下一步"
            onPress={() =>
              setIndex((value) =>
                Math.min(positions.length - 1, value + 1),
              )
            }
          />
          <ReviewButton
            disabled={index === positions.length - 1}
            label="到结尾"
            onPress={() => setIndex(positions.length - 1)}
          />
        </View>

        <View style={styles.footerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFlipped((value) => !value)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>翻转棋盘</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onRestart}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>开始新对局</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

type ReviewButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function ReviewButton({
  disabled,
  label,
  onPress,
}: ReviewButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reviewButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.reviewButtonText,
          disabled && styles.disabledButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#171a18',
    flex: 1,
  },
  content: {
    paddingBottom: 24,
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
  title: {
    color: '#f4f1e8',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca49a',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  headerButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#e5e2d9',
    fontSize: 11,
    fontWeight: '700',
  },
  boardWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moveCard: {
    alignItems: 'center',
    backgroundColor: '#222722',
    borderColor: '#3d443d',
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
  },
  moveLabel: {
    color: '#f2efe6',
    fontSize: 15,
    fontWeight: '800',
  },
  progress: {
    color: '#d0a35a',
    fontSize: 11,
    marginTop: 3,
  },
  feedback: {
    color: '#8e968d',
    fontSize: 10,
    marginTop: 3,
  },
  navigation: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },
  reviewButton: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingHorizontal: 3,
  },
  reviewButtonText: {
    color: '#efede4',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#202420',
    borderColor: '#2d322d',
  },
  disabledButtonText: {
    color: '#5e655e',
  },
  pressed: {
    opacity: 0.68,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#525a51',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryButtonText: {
    color: '#e8e5dc',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryButtonText: {
    color: '#fff7e8',
    fontSize: 12,
    fontWeight: '800',
  },
});
