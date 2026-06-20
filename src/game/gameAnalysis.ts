import type {
  EnginePositionAnalysis,
  EngineProvider,
  EngineSearchOptions,
  EngineScore,
} from '../engine/ChessEngine';
import type { LegalMove, ReplayPosition } from './chessState';

export type RawMoveClassification =
  | 'book'
  | 'forced'
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'miss'
  | 'mistake'
  | 'blunder';

export type DisplayMoveBucket =
  | 'brilliant'
  | 'best'
  | 'solid'
  | 'question'
  | 'error';

export type MoveReviewGrade = 'best' | 'review' | 'unavailable';

export type MoveBucketCount = Record<DisplayMoveBucket, number>;

export type MoveReview = {
  bestMoveSan?: string;
  color: 'b' | 'w';
  displayBucket?: DisplayMoveBucket;
  evalAfterCp?: number;
  evalBeforeCp?: number;
  explanation: string;
  fallbackReason?: string;
  grade: MoveReviewGrade;
  mateAfter?: number;
  mateBefore?: number;
  moveNumber: number;
  playedSan: string;
  ply: number;
  provider: EngineProvider;
  rawClassification?: RawMoveClassification;
  score: EngineScore | null;
  scoreLabel: string;
  whiteWinRateAfter: number;
  whiteWinRateBefore: number;
  winRateDelta: number;
};

export type ReviewSummary = {
  analyzed: number;
  best: number;
  black: SideMoveQualitySummary;
  bucketCount: MoveBucketCount;
  needsReview: number;
  summaryText: string;
  totalPly: number;
  turningPoints: TurningPoint[];
  unavailable: number;
  white: SideMoveQualitySummary;
  winRateSeries: WinRatePoint[];
};

export type SideMoveQualitySummary = {
  bucketCount: MoveBucketCount;
  label: string;
  recommendationMatchRate: number | null;
  side: 'black' | 'white';
  totalMoves: number;
  unavailable: number;
};

export type WinRatePoint = {
  bucket?: DisplayMoveBucket;
  evalCp?: number;
  mateIn?: number;
  moveNumber: number;
  ply: number;
  san: string;
  sideToMoveAfter: 'black' | 'white';
  whiteWinRate: number;
};

export type TurningPoint = {
  bucket?: DisplayMoveBucket;
  description: string;
  moveNumber: number;
  ply: number;
  san: string;
  whiteWinRateDelta: number;
};

export const STOCKFISH_REVIEW_OPTIONS: EngineSearchOptions = {
  difficulty: 'intermediate',
  moveTimeMs: 1_200,
  stockfishSkillLevel: 20,
  timeoutMs: 9_000,
};

const BUCKET_LABELS: Record<DisplayMoveBucket, string> = {
  best: '最佳',
  brilliant: '精彩',
  error: '错误',
  question: '疑问',
  solid: '稳健',
};

const EMPTY_BUCKET_COUNT: MoveBucketCount = {
  best: 0,
  brilliant: 0,
  error: 0,
  question: 0,
  solid: 0,
};

const MATE_CP = 1_000;

export function getDisplayBucketLabel(bucket: DisplayMoveBucket): string {
  return BUCKET_LABELS[bucket];
}

export function cpToWhiteWinRate(evalCp: number): number {
  const x = Math.max(-4, Math.min(4, evalCp / 400));
  return Math.round(100 / (1 + Math.exp(-x)));
}

export function createMoveReview(
  before: ReplayPosition,
  after: ReplayPosition,
  beforeAnalysis: EnginePositionAnalysis,
  afterAnalysis?: EnginePositionAnalysis,
): MoveReview {
  if (!after.move) {
    throw new Error('初始局面没有实战走法可复盘');
  }

  const color = before.snapshot.status.turn;
  const evalBeforeCp = scoreToWhiteCp(beforeAnalysis.score, color);
  const evalAfterCp = scoreToWhiteCp(
    afterAnalysis?.score ?? null,
    after.snapshot.status.turn,
  );
  const whiteWinRateBefore =
    typeof evalBeforeCp === 'number' ? cpToWhiteWinRate(evalBeforeCp) : 50;
  const whiteWinRateAfter =
    typeof evalAfterCp === 'number'
      ? cpToWhiteWinRate(evalAfterCp)
      : whiteWinRateBefore;
  const winRateDelta = whiteWinRateAfter - whiteWinRateBefore;
  const classification = classifyMove(
    color,
    beforeAnalysis,
    afterAnalysis,
    after.move,
    evalBeforeCp,
    evalAfterCp,
  );
  const base = {
    color,
    displayBucket: classification.displayBucket,
    evalAfterCp,
    evalBeforeCp,
    fallbackReason:
      beforeAnalysis.fallbackReason ?? afterAnalysis?.fallbackReason,
    grade: classification.grade,
    mateAfter:
      afterAnalysis?.score?.type === 'mate'
        ? afterAnalysis.score.value
        : undefined,
    mateBefore:
      beforeAnalysis.score?.type === 'mate'
        ? beforeAnalysis.score.value
        : undefined,
    moveNumber: getMoveNumber(after.ply),
    playedSan: after.move.san,
    ply: after.ply,
    provider: beforeAnalysis.provider,
    rawClassification: classification.rawClassification,
    score: afterAnalysis?.score ?? beforeAnalysis.score,
    scoreLabel: formatEngineScore(
      afterAnalysis?.score ?? beforeAnalysis.score,
      afterAnalysis ? after.snapshot.status.turn : color,
    ),
    whiteWinRateAfter,
    whiteWinRateBefore,
    winRateDelta,
  };

  if (classification.grade === 'unavailable') {
    return {
      ...base,
      explanation:
        '本步没有完成深度分析，暂时只保留实战走法和棋盘位置。',
    };
  }

  if (classification.grade === 'best') {
    return {
      ...base,
      bestMoveSan: beforeAnalysis.move?.san,
      explanation: '实战走法与推荐走法一致。',
    };
  }

  return {
    ...base,
    bestMoveSan: beforeAnalysis.move?.san,
    explanation: `建议重点复查，本步被归入“${
      classification.displayBucket
        ? BUCKET_LABELS[classification.displayBucket]
        : '待定'
    }”。`,
  };
}

export function summarizeMoveReviews(
  reviews: MoveReview[],
  totalPly: number,
): ReviewSummary {
  const analyzed = reviews.length;
  const best = reviews.filter((review) => review.grade === 'best').length;
  const needsReview = reviews.filter(
    (review) => review.grade === 'review',
  ).length;
  const unavailable = reviews.filter(
    (review) => review.grade === 'unavailable',
  ).length;
  const bucketCount = countBuckets(reviews);
  const white = summarizeSideReviews('白方', reviews, 'w');
  const black = summarizeSideReviews('黑方', reviews, 'b');
  const progressPercent =
    totalPly > 0 ? Math.round((analyzed / totalPly) * 100) : 100;
  const parts = [
    `复盘进度 ${progressPercent}%`,
    `推荐吻合 ${best} 步`,
    `建议复查 ${needsReview} 步`,
    white.label,
    black.label,
  ];

  if (unavailable > 0) {
    parts.push(`未完成 ${unavailable} 步`);
  }

  return {
    analyzed,
    best,
    black,
    bucketCount,
    needsReview,
    summaryText: parts.join(' · '),
    totalPly,
    turningPoints: findTurningPoints(reviews),
    unavailable,
    white,
    winRateSeries: buildWinRateSeries(reviews),
  };
}

export function formatMoveReview(review: MoveReview): string {
  const side = review.color === 'w' ? '白方' : '黑方';
  const bestMove = review.bestMoveSan
    ? ` 推荐走法：${review.bestMoveSan}。`
    : '';
  const bucket = review.displayBucket
    ? ` 评价：${BUCKET_LABELS[review.displayBucket]}。`
    : '';
  const winRate = ` 局势变化：白方胜率 ${review.whiteWinRateBefore}% → ${review.whiteWinRateAfter}%。`;
  const score = ` 评估：${review.scoreLabel}。`;

  return `第 ${review.moveNumber} 回合 ${side} ${review.playedSan}：${review.explanation}${bestMove}${bucket}${winRate}${score}`;
}

function classifyMove(
  color: 'b' | 'w',
  beforeAnalysis: EnginePositionAnalysis,
  afterAnalysis: EnginePositionAnalysis | undefined,
  playedMove: LegalMove,
  evalBeforeCp: number | undefined,
  evalAfterCp: number | undefined,
): {
  displayBucket?: DisplayMoveBucket;
  grade: MoveReviewGrade;
  rawClassification?: RawMoveClassification;
} {
  if (beforeAnalysis.provider !== 'stockfish' || !beforeAnalysis.move) {
    return {
      grade: 'unavailable',
    };
  }

  const exactMatch = isSameMove(playedMove, beforeAnalysis.move);

  if (exactMatch) {
    return {
      displayBucket: 'best',
      grade: 'best',
      rawClassification: 'best',
    };
  }

  if (
    afterAnalysis?.provider !== 'stockfish' ||
    typeof evalBeforeCp !== 'number' ||
    typeof evalAfterCp !== 'number'
  ) {
    return {
      displayBucket: 'question',
      grade: 'review',
      rawClassification: 'inaccuracy',
    };
  }

  const sideEvalBefore = color === 'w' ? evalBeforeCp : -evalBeforeCp;
  const sideEvalAfter = color === 'w' ? evalAfterCp : -evalAfterCp;
  const loss = Math.max(0, sideEvalBefore - sideEvalAfter);

  if (loss <= 20) {
    return {
      displayBucket: 'best',
      grade: 'best',
      rawClassification: 'excellent',
    };
  }

  if (loss <= 60) {
    return {
      displayBucket: 'solid',
      grade: 'review',
      rawClassification: 'good',
    };
  }

  if (loss <= 150) {
    return {
      displayBucket: 'question',
      grade: 'review',
      rawClassification: 'inaccuracy',
    };
  }

  return {
    displayBucket: 'error',
    grade: 'review',
    rawClassification: loss > 300 ? 'blunder' : 'mistake',
  };
}

function summarizeSideReviews(
  sideLabel: string,
  reviews: MoveReview[],
  color: 'b' | 'w',
): SideMoveQualitySummary {
  const sideReviews = reviews.filter((review) => review.color === color);
  const available = sideReviews.filter(
    (review) => review.grade !== 'unavailable',
  );
  const best = available.filter((review) => review.grade === 'best').length;
  const recommendationMatchRate =
    available.length > 0 ? Math.round((best / available.length) * 100) : null;
  const label =
    recommendationMatchRate === null
      ? `${sideLabel}吻合率待分析`
      : `${sideLabel}吻合率 ${recommendationMatchRate}%`;

  return {
    bucketCount: countBuckets(sideReviews),
    label,
    recommendationMatchRate,
    side: color === 'w' ? 'white' : 'black',
    totalMoves: sideReviews.length,
    unavailable: sideReviews.length - available.length,
  };
}

function countBuckets(reviews: MoveReview[]): MoveBucketCount {
  const count = { ...EMPTY_BUCKET_COUNT };

  reviews.forEach((review) => {
    if (review.displayBucket) {
      count[review.displayBucket] += 1;
    }
  });

  return count;
}

function buildWinRateSeries(reviews: MoveReview[]): WinRatePoint[] {
  const sorted = [...reviews].sort((left, right) => left.ply - right.ply);

  if (sorted.length === 0) {
    return [];
  }

  const first = sorted[0];
  const points: WinRatePoint[] = [
    {
      evalCp: first.evalBeforeCp,
      mateIn: first.mateBefore,
      moveNumber: 0,
      ply: 0,
      san: '开始',
      sideToMoveAfter: first.color === 'w' ? 'white' : 'black',
      whiteWinRate: first.whiteWinRateBefore,
    },
  ];

  sorted.forEach((review) => {
    points.push({
      bucket: review.displayBucket,
      evalCp: review.evalAfterCp,
      mateIn: review.mateAfter,
      moveNumber: review.moveNumber,
      ply: review.ply,
      san: review.playedSan,
      sideToMoveAfter: review.color === 'w' ? 'black' : 'white',
      whiteWinRate: review.whiteWinRateAfter,
    });
  });

  return points;
}

function findTurningPoints(reviews: MoveReview[]): TurningPoint[] {
  return [...reviews]
    .filter((review) => Math.abs(review.winRateDelta) >= 12)
    .sort(
      (left, right) =>
        Math.abs(right.winRateDelta) - Math.abs(left.winRateDelta),
    )
    .slice(0, 4)
    .map((review) => ({
      bucket: review.displayBucket,
      description:
        review.winRateDelta < 0
          ? `白方胜率下降 ${Math.abs(review.winRateDelta)}%`
          : `白方胜率上升 ${review.winRateDelta}%`,
      moveNumber: review.moveNumber,
      ply: review.ply,
      san: review.playedSan,
      whiteWinRateDelta: review.winRateDelta,
    }));
}

function isSameMove(left: LegalMove, right: LegalMove): boolean {
  return (
    left.from === right.from &&
    left.to === right.to &&
    left.promotion === right.promotion
  );
}

function getMoveNumber(ply: number): number {
  return Math.ceil(ply / 2);
}

function scoreToWhiteCp(
  score: EngineScore | null,
  sideToMove: 'b' | 'w',
): number | undefined {
  if (!score) {
    return undefined;
  }

  const sideMultiplier = sideToMove === 'w' ? 1 : -1;

  if (score.type === 'mate') {
    return score.value > 0 ? MATE_CP * sideMultiplier : -MATE_CP * sideMultiplier;
  }

  return score.value * sideMultiplier;
}

function formatEngineScore(
  score: EngineScore | null,
  sideToMove: 'b' | 'w',
): string {
  if (!score) {
    return '暂无';
  }

  const whiteValue = scoreToWhiteCp(score, sideToMove);

  if (score.type === 'mate') {
    if (typeof whiteValue === 'number' && whiteValue > 0) {
      return `白方 M${Math.abs(score.value)}`;
    }

    if (typeof whiteValue === 'number' && whiteValue < 0) {
      return `黑方 M${Math.abs(score.value)}`;
    }

    return `M${Math.abs(score.value)}`;
  }

  const pawns = (whiteValue ?? 0) / 100;
  const sign = pawns > 0 ? '+' : '';

  return `白方 ${sign}${pawns.toFixed(2)}`;
}
