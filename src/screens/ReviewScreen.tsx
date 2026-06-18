import * as Clipboard from 'expo-clipboard';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ChessBoard } from '../components/Board/ChessBoard';
import { chessEngine } from '../engine/defaultEngine';
import {
  createMoveReview,
  formatMoveReview,
  type MoveReview,
  STOCKFISH_REVIEW_OPTIONS,
  summarizeMoveReviews,
} from '../game/gameAnalysis';
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
  const [reviewsByPly, setReviewsByPly] = useState<
    Record<number, MoveReview>
  >({});
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRunIdRef = useRef(0);
  const { height, width } = useWindowDimensions();
  const boardSize = Math.floor(
    Math.min(width - 24, Math.max(236, height - 330), 540),
  );
  const position = positions[index];
  const currentReview = reviewsByPly[position.ply];
  const reviewSummary = useMemo(
    () =>
      summarizeMoveReviews(
        Object.values(reviewsByPly).sort((left, right) => left.ply - right.ply),
        positions.length - 1,
      ),
    [positions.length, reviewsByPly],
  );
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

  const analyzePly = useCallback(
    async (targetIndex: number, runId: number) => {
      const before = positions[targetIndex - 1];
      const after = positions[targetIndex];

      const result = await chessEngine.analyzePosition(
        before.snapshot.fen,
        STOCKFISH_REVIEW_OPTIONS,
      );

      if (analysisRunIdRef.current !== runId) {
        return null;
      }

      const review = createMoveReview(before, after, result);
      setReviewsByPly((value) => ({
        ...value,
        [review.ply]: review,
      }));

      return review;
    },
    [positions],
  );

  const analyzeCurrentMove = useCallback(async () => {
    if (index === 0 || isAnalyzing) {
      return;
    }

    const runId = analysisRunIdRef.current + 1;
    analysisRunIdRef.current = runId;
    setIsAnalyzing(true);
    setAnalysisProgress(`正在分析第 ${index} / ${positions.length - 1} 步`);
    setFeedback('本机 Stockfish 正在复盘当前步');

    try {
      const review = await analyzePly(index, runId);

      if (analysisRunIdRef.current === runId && review) {
        setFeedback(formatMoveReview(review));
        setAnalysisProgress('');
      }
    } catch {
      if (analysisRunIdRef.current === runId) {
        setFeedback('当前步复盘失败，请稍后重试');
        setAnalysisProgress('');
      }
    } finally {
      if (analysisRunIdRef.current === runId) {
        setIsAnalyzing(false);
      }
    }
  }, [analyzePly, index, isAnalyzing, positions.length]);

  const analyzeWholeGame = useCallback(async () => {
    if (isAnalyzing || positions.length <= 1) {
      return;
    }

    const runId = analysisRunIdRef.current + 1;
    analysisRunIdRef.current = runId;
    setIsAnalyzing(true);
    setFeedback('开始全局复盘，长棋局会需要更久');

    try {
      for (let targetIndex = 1; targetIndex < positions.length; targetIndex += 1) {
        if (analysisRunIdRef.current !== runId) {
          break;
        }

        setAnalysisProgress(
          `正在分析第 ${targetIndex} / ${positions.length - 1} 步`,
        );
        await analyzePly(targetIndex, runId);
      }

      if (analysisRunIdRef.current === runId) {
        setAnalysisProgress('');
        setFeedback('全局复盘完成');
      }
    } catch {
      if (analysisRunIdRef.current === runId) {
        setFeedback('全局复盘中断，请稍后重试');
        setAnalysisProgress('');
      }
    } finally {
      if (analysisRunIdRef.current === runId) {
        setIsAnalyzing(false);
      }
    }
  }, [analyzePly, isAnalyzing, positions.length]);

  const stopAnalysis = useCallback(() => {
    analysisRunIdRef.current += 1;
    setIsAnalyzing(false);
    setAnalysisProgress('');
    setFeedback('已停止本地复盘');
    void chessEngine.stop();
  }, []);

  useEffect(() => {
    analysisRunIdRef.current += 1;
    setReviewsByPly({});
    setAnalysisProgress('');
    setIsAnalyzing(false);
    setFeedback('使用按钮逐步查看棋局');

    return () => {
      analysisRunIdRef.current += 1;
      void chessEngine.stop();
    };
  }, [record.id]);

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

        <View accessibilityLiveRegion="polite" style={styles.analysisCard}>
          <View style={styles.analysisHeading}>
            <Text style={styles.analysisTitle}>Stockfish 本地复盘</Text>
            <Text style={styles.analysisBadge}>约 3000 分</Text>
          </View>
          <Text style={styles.analysisMeta}>
            全程离线 · 每步约 1.2 秒 · 每步保留评分和 AI 推荐下法
          </Text>
          <Text style={styles.analysisText}>
            {index === 0
              ? '请选择一步棋，再分析该步。'
              : currentReview
                ? formatMoveReview(currentReview)
                : '当前步还没有分析。'}
          </Text>
          <Text style={styles.analysisSummary}>
            {analysisProgress || reviewSummary.summaryText}
          </Text>
          <View style={styles.analysisActions}>
            <AnalysisButton
              disabled={index === 0 || isAnalyzing}
              label="分析当前步"
              onPress={analyzeCurrentMove}
            />
            <AnalysisButton
              disabled={isAnalyzing || positions.length <= 1}
              label="全局复盘"
              onPress={analyzeWholeGame}
            />
            <AnalysisButton
              disabled={!isAnalyzing}
              label="停止"
              onPress={stopAnalysis}
            />
          </View>
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

type AnalysisButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
};

function AnalysisButton({
  disabled,
  label,
  onPress,
}: AnalysisButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.analysisButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.analysisButtonText,
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
  analysisCard: {
    backgroundColor: '#202620',
    borderColor: '#4a5149',
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 9,
    padding: 11,
  },
  analysisHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analysisTitle: {
    color: '#f1eee5',
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    marginRight: 8,
  },
  analysisBadge: {
    color: '#d8ab63',
    fontSize: 11,
    fontWeight: '900',
  },
  analysisMeta: {
    color: '#8f978e',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  analysisText: {
    color: '#d8ddd4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  analysisSummary: {
    color: '#d0a35a',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 6,
  },
  analysisActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },
  analysisButton: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 39,
    paddingHorizontal: 4,
  },
  analysisButtonText: {
    color: '#efede4',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
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
