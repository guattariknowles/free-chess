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
  type ViewStyle,
} from 'react-native';

import { ChessBoard } from '../components/Board/ChessBoard';
import { chessEngine } from '../engine/defaultEngine';
import {
  createMoveReview,
  formatMoveReview,
  getDisplayBucketLabel,
  type DisplayMoveBucket,
  type MoveBucketCount,
  type MoveReview,
  STOCKFISH_REVIEW_OPTIONS,
  summarizeMoveReviews,
  type TurningPoint,
  type WinRatePoint,
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

type ReviewMode = 'board' | 'report';

const BUCKET_ORDER: DisplayMoveBucket[] = [
  'brilliant',
  'best',
  'solid',
  'question',
  'error',
];

export function ReviewScreen({
  onBack,
  onRestart,
  record,
}: ReviewScreenProps) {
  const positions = useMemo(() => getReplayPositions(record), [record]);
  const [index, setIndex] = useState(positions.length - 1);
  const [flipped, setFlipped] = useState(false);
  const [feedback, setFeedback] = useState('使用按钮逐步查看棋局');
  const [mode, setMode] = useState<ReviewMode>('board');
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
  const reportChartWidth = Math.min(width - 48, 420);
  const position = positions[index];
  const totalPly = positions.length - 1;
  const currentReview = reviewsByPly[position.ply];
  const reviewSummary = useMemo(
    () =>
      summarizeMoveReviews(
        Object.values(reviewsByPly).sort((left, right) => left.ply - right.ply),
        totalPly,
      ),
    [reviewsByPly, totalPly],
  );
  const analysisDone = totalPly > 0 && reviewSummary.analyzed >= totalPly;
  const progressPercent =
    totalPly > 0
      ? Math.min(100, Math.round((reviewSummary.analyzed / totalPly) * 100))
      : 100;
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

      const beforeAnalysis = await chessEngine.analyzePosition(
        before.snapshot.fen,
        STOCKFISH_REVIEW_OPTIONS,
      );

      if (analysisRunIdRef.current !== runId) {
        return null;
      }

      const afterAnalysis = await chessEngine.analyzePosition(
        after.snapshot.fen,
        STOCKFISH_REVIEW_OPTIONS,
      );

      if (analysisRunIdRef.current !== runId) {
        return null;
      }

      const review = createMoveReview(
        before,
        after,
        beforeAnalysis,
        afterAnalysis,
      );
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
    setMode('board');
    setAnalysisProgress('正在分析关键局面…');
    setFeedback('正在分析局面…');

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
  }, [analyzePly, index, isAnalyzing]);

  const analyzeWholeGame = useCallback(async () => {
    if (isAnalyzing || positions.length <= 1) {
      return;
    }

    const runId = analysisRunIdRef.current + 1;
    analysisRunIdRef.current = runId;
    setIsAnalyzing(true);
    setMode('board');
    setFeedback('正在分析局面…');

    try {
      for (let targetIndex = 1; targetIndex < positions.length; targetIndex += 1) {
        if (analysisRunIdRef.current !== runId) {
          break;
        }

        const percent = Math.round((targetIndex / totalPly) * 100);
        setAnalysisProgress(`复盘进度 ${percent}%`);
        await analyzePly(targetIndex, runId);
      }

      if (analysisRunIdRef.current === runId) {
        setAnalysisProgress('');
        setFeedback('复盘完成，可以查看复盘报告。');
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
  }, [analyzePly, isAnalyzing, positions.length, totalPly]);

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
    setMode('board');
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

        {mode === 'report' ? (
          <AnalysisReport
            chartWidth={reportChartWidth}
            onBackToBoard={() => setMode('board')}
            onSelectPly={(ply) => {
              setIndex(Math.max(0, Math.min(positions.length - 1, ply)));
              setMode('board');
            }}
            record={record}
            summary={reviewSummary}
          />
        ) : (
          <>
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
                第 {index} / {totalPly} 步
              </Text>
              <Text style={styles.feedback}>{feedback}</Text>
            </View>

            <View accessibilityLiveRegion="polite" style={styles.analysisCard}>
              <View style={styles.analysisHeading}>
                <Text style={styles.analysisTitle}>本地深度复盘</Text>
                <Text style={styles.analysisBadge}>
                  {analysisDone ? '复盘完成' : isAnalyzing ? '复盘中' : '未完成'}
                </Text>
              </View>
              <Text style={styles.analysisMeta}>
                全程离线 · 结果为本地估算 · 可先看报告，再逐步复盘
              </Text>
              <ProgressBar percent={isAnalyzing ? progressPercent : progressPercent} />
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
              <Text style={styles.analysisSmall}>
                已完成 {reviewSummary.analyzed} / {totalPly} 个局面
              </Text>
              <View style={styles.analysisActions}>
                <AnalysisButton
                  disabled={index === 0 || isAnalyzing}
                  label="分析当前步"
                  onPress={analyzeCurrentMove}
                />
                <AnalysisButton
                  disabled={isAnalyzing || positions.length <= 1}
                  label={isAnalyzing ? '复盘中' : '开始复盘'}
                  onPress={analyzeWholeGame}
                />
                <AnalysisButton
                  disabled={!isAnalyzing}
                  label="停止"
                  onPress={stopAnalysis}
                />
                <AnalysisButton
                  disabled={!analysisDone || isAnalyzing}
                  label="查看复盘报告"
                  onPress={() => setMode('report')}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

type AnalysisReportProps = {
  chartWidth: number;
  onBackToBoard: () => void;
  onSelectPly: (ply: number) => void;
  record: GameRecord;
  summary: ReturnType<typeof summarizeMoveReviews>;
};

function AnalysisReport({
  chartWidth,
  onBackToBoard,
  onSelectPly,
  record,
  summary,
}: AnalysisReportProps) {
  return (
    <View style={styles.report}>
      <View style={styles.reportHero}>
        <Text style={styles.reportTitle}>复盘报告</Text>
        <Text style={styles.reportSubtitle}>
          {getResultLabel(record.result)} · {record.moveCount} 步 · 复盘进度 100%
        </Text>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>双方表现摘要</Text>
        <View style={styles.sideSummaryRow}>
          <SideSummaryCard title="白方" summary={summary.white} />
          <SideSummaryCard title="黑方" summary={summary.black} />
        </View>
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>五档走法质量统计</Text>
        <BucketTable
          black={summary.black.bucketCount}
          white={summary.white.bucketCount}
        />
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>胜率变化</Text>
        <WinRateLineChart
          points={summary.winRateSeries}
          width={chartWidth}
        />
      </View>

      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>关键问题</Text>
        {summary.turningPoints.length > 0 ? (
          summary.turningPoints.map((point) => (
            <TurningPointButton
              key={point.ply}
              onPress={() => onSelectPly(point.ply)}
              point={point}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>
            暂未发现明显的大幅波动，可以从逐步复盘继续查看。
          </Text>
        )}
      </View>

      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onBackToBoard}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>逐步复盘</Text>
        </Pressable>
      </View>
    </View>
  );
}

type SideSummaryCardProps = {
  summary: {
    recommendationMatchRate: number | null;
    totalMoves: number;
    unavailable: number;
  };
  title: string;
};

function SideSummaryCard({ summary, title }: SideSummaryCardProps) {
  const match =
    summary.recommendationMatchRate === null
      ? '待分析'
      : `${summary.recommendationMatchRate}%`;

  return (
    <View style={styles.sideSummaryCard}>
      <Text style={styles.sideTitle}>{title}</Text>
      <Text style={styles.sideMetric}>{match}</Text>
      <Text style={styles.sideMeta}>
        推荐吻合率 · 已复盘 {summary.totalMoves} 步
      </Text>
      {summary.unavailable > 0 ? (
        <Text style={styles.sideWarning}>未完成 {summary.unavailable} 步</Text>
      ) : null}
    </View>
  );
}

type BucketTableProps = {
  black: MoveBucketCount;
  white: MoveBucketCount;
};

function BucketTable({ black, white }: BucketTableProps) {
  return (
    <View style={styles.bucketTable}>
      <View style={styles.bucketHeader}>
        <Text style={styles.bucketHeaderText}>档位</Text>
        <Text style={styles.bucketHeaderText}>白方</Text>
        <Text style={styles.bucketHeaderText}>黑方</Text>
      </View>
      {BUCKET_ORDER.map((bucket) => (
        <View key={bucket} style={styles.bucketRow}>
          <Text style={styles.bucketLabel}>
            {getDisplayBucketLabel(bucket)}
          </Text>
          <Text style={styles.bucketValue}>{white[bucket]}</Text>
          <Text style={styles.bucketValue}>{black[bucket]}</Text>
        </View>
      ))}
    </View>
  );
}

type WinRateLineChartProps = {
  points: WinRatePoint[];
  width: number;
};

function WinRateLineChart({ points, width }: WinRateLineChartProps) {
  const height = 118;

  if (points.length < 2) {
    return <Text style={styles.emptyText}>完成整局复盘后显示胜率变化。</Text>;
  }

  const plotted = points.map((point, index) => ({
    point,
    x: points.length === 1 ? 0 : (index / (points.length - 1)) * width,
    y: ((100 - point.whiteWinRate) / 100) * height,
  }));

  return (
    <View style={[styles.chart, { height, width }]}>
      <Text style={[styles.axisLabel, styles.axisTop]}>100%</Text>
      <Text style={[styles.axisLabel, styles.axisMiddle]}>50%</Text>
      <Text style={[styles.axisLabel, styles.axisBottom]}>0%</Text>
      <View style={[styles.midLine, { top: height / 2, width }]} />
      {plotted.slice(1).map((current, index) => {
        const previous = plotted[index];
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        return (
          <View
            key={`${current.point.ply}-${previous.point.ply}`}
            style={[
              styles.chartSegment,
              {
                left: (current.x + previous.x - length) / 2,
                top: (current.y + previous.y) / 2,
                transform: [{ rotate: `${angle}rad` }],
                width: length,
              },
            ]}
          />
        );
      })}
      {plotted.map(({ point, x, y }) => (
        <View
          key={point.ply}
          style={[
            styles.chartPoint,
            point.bucket === 'error' && styles.chartPointError,
            point.bucket === 'question' && styles.chartPointQuestion,
            { left: x - 4, top: y - 4 },
          ]}
        />
      ))}
    </View>
  );
}

type TurningPointButtonProps = {
  onPress: () => void;
  point: TurningPoint;
};

function TurningPointButton({ onPress, point }: TurningPointButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.turningPoint,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.turningTitle}>
        第 {point.moveNumber} 回合 {point.san}
      </Text>
      <Text style={styles.turningMeta}>
        {point.description}
        {point.bucket ? ` · ${getDisplayBucketLabel(point.bucket)}` : ''}
      </Text>
    </Pressable>
  );
}

type ProgressBarProps = {
  percent: number;
};

function ProgressBar({ percent }: ProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${safePercent}%` }]} />
      <Text style={styles.progressText}>{safePercent}%</Text>
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    textAlign: 'center',
  },
  analysisCard: {
    backgroundColor: '#202620',
    borderColor: '#4a5149',
    borderRadius: 8,
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
  progressTrack: {
    alignItems: 'center',
    backgroundColor: '#151a15',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    marginTop: 9,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#b8792c',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  progressText: {
    color: '#fff7e8',
    fontSize: 11,
    fontWeight: '900',
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
  analysisSmall: {
    color: '#7f897e',
    fontSize: 10,
    marginTop: 3,
  },
  analysisActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  analysisButton: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#454d45',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '47%',
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
    borderRadius: 8,
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
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryButtonText: {
    color: '#fff7e8',
    fontSize: 12,
    fontWeight: '800',
  },
  report: {
    marginTop: 12,
  },
  reportHero: {
    backgroundColor: '#202620',
    borderColor: '#4a5149',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  reportTitle: {
    color: '#f4f1e8',
    fontSize: 18,
    fontWeight: '900',
  },
  reportSubtitle: {
    color: '#aeb6ac',
    fontSize: 11,
    marginTop: 4,
  },
  reportSection: {
    marginTop: 12,
  },
  sectionTitle: {
    color: '#f1eee5',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 7,
  },
  sideSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sideSummaryCard: {
    backgroundColor: '#202620',
    borderColor: '#404840',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  sideTitle: {
    color: '#f4f1e8',
    fontSize: 12,
    fontWeight: '800',
  },
  sideMetric: {
    color: '#d8ab63',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
  },
  sideMeta: {
    color: '#9da69b',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  sideWarning: {
    color: '#d8ab63',
    fontSize: 10,
    marginTop: 4,
  },
  bucketTable: {
    backgroundColor: '#202620',
    borderColor: '#404840',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bucketHeader: {
    backgroundColor: '#2a312a',
    flexDirection: 'row',
    paddingVertical: 8,
  },
  bucketHeaderText: {
    color: '#f4f1e8',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  bucketRow: {
    borderTopColor: '#333b33',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 9,
  },
  bucketLabel: {
    color: '#d8ddd4',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  bucketValue: {
    color: '#f4f1e8',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  chart: {
    backgroundColor: '#202620',
    borderColor: '#404840',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  axisLabel: {
    color: '#788278',
    fontSize: 9,
    left: 6,
    position: 'absolute',
    zIndex: 2,
  },
  axisTop: {
    top: 4,
  },
  axisMiddle: {
    top: 52,
  },
  axisBottom: {
    bottom: 4,
  },
  midLine: {
    backgroundColor: '#303830',
    height: 1,
    left: 0,
    position: 'absolute',
  },
  chartSegment: {
    backgroundColor: '#d8ab63',
    height: 2,
    position: 'absolute',
  } as ViewStyle,
  chartPoint: {
    backgroundColor: '#f4f1e8',
    borderColor: '#202620',
    borderRadius: 999,
    borderWidth: 1,
    height: 8,
    position: 'absolute',
    width: 8,
  },
  chartPointError: {
    backgroundColor: '#d96556',
  },
  chartPointQuestion: {
    backgroundColor: '#d8ab63',
  },
  turningPoint: {
    backgroundColor: '#202620',
    borderColor: '#404840',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 7,
    padding: 10,
  },
  turningTitle: {
    color: '#f4f1e8',
    fontSize: 12,
    fontWeight: '800',
  },
  turningMeta: {
    color: '#aeb6ac',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  emptyText: {
    color: '#aeb6ac',
    fontSize: 11,
    lineHeight: 17,
  },
});
