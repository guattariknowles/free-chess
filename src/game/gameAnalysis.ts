import type {
  EngineProvider,
  EnginePositionAnalysis,
  EngineSearchOptions,
  EngineScore,
} from '../engine/ChessEngine';
import type { LegalMove, ReplayPosition } from './chessState';

export type MoveReviewGrade = 'best' | 'review' | 'unavailable';

export type MoveReview = {
  bestMoveSan?: string;
  color: 'b' | 'w';
  explanation: string;
  fallbackReason?: string;
  grade: MoveReviewGrade;
  moveNumber: number;
  playedSan: string;
  ply: number;
  provider: EngineProvider;
  score: EngineScore | null;
  scoreLabel: string;
};

export type ReviewSummary = {
  analyzed: number;
  best: number;
  needsReview: number;
  black: SideReviewStats;
  summaryText: string;
  totalPly: number;
  unavailable: number;
  white: SideReviewStats;
};

export type SideReviewStats = {
  best: number;
  label: string;
  overlapPercent: number | null;
  stockfishAnalyzed: number;
  unavailable: number;
};

export const STOCKFISH_REVIEW_OPTIONS: EngineSearchOptions = {
  difficulty: 'intermediate',
  moveTimeMs: 1_200,
  stockfishSkillLevel: 20,
  timeoutMs: 9_000,
};

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

export function createMoveReview(
  before: ReplayPosition,
  after: ReplayPosition,
  result: EnginePositionAnalysis,
): MoveReview {
  if (!after.move) {
    throw new Error('初始局面没有实战走法可复盘');
  }

  const color = before.snapshot.status.turn;
  const base = {
    color,
    fallbackReason: result.fallbackReason,
    moveNumber: getMoveNumber(after.ply),
    playedSan: after.move.san,
    ply: after.ply,
    provider: result.provider,
    score: result.score,
    scoreLabel: formatEngineScore(result.score, color),
  };

  if (result.provider !== 'stockfish' || !result.move) {
    return {
      ...base,
      explanation:
        'Stockfish 没有完成本步计算，暂不能给出约 3000 分复盘判断。',
      grade: 'unavailable',
    };
  }

  if (isSameMove(after.move, result.move)) {
    return {
      ...base,
      bestMoveSan: result.move.san,
      explanation: '实战走法与 Stockfish 首选一致。',
      grade: 'best',
    };
  }

  return {
    ...base,
    bestMoveSan: result.move.san,
    explanation:
      '实战走法不是 Stockfish 首选，建议回到该局面重点复查。',
    grade: 'review',
  };
}

export function summarizeMoveReviews(
  reviews: MoveReview[],
  totalPly: number,
): ReviewSummary {
  const best = reviews.filter((review) => review.grade === 'best').length;
  const needsReview = reviews.filter(
    (review) => review.grade === 'review',
  ).length;
  const unavailable = reviews.filter(
    (review) => review.grade === 'unavailable',
  ).length;
  const white = summarizeSideReviews('白方', reviews, 'w');
  const black = summarizeSideReviews('黑方', reviews, 'b');
  const analyzed = reviews.length;
  const remaining = Math.max(0, totalPly - analyzed);
  const parts = [
    `已分析 ${analyzed}/${totalPly} 步`,
    `首选一致 ${best} 步`,
    `建议复查 ${needsReview} 步`,
    white.label,
    black.label,
  ];

  if (unavailable > 0) {
    parts.push(`未完成 ${unavailable} 步`);
  }
  if (remaining > 0) {
    parts.push(`剩余 ${remaining} 步`);
  }

  return {
    analyzed,
    best,
    black,
    needsReview,
    summaryText: parts.join(' · '),
    totalPly,
    unavailable,
    white,
  };
}

export function formatMoveReview(review: MoveReview): string {
  const side = review.color === 'w' ? '白方' : '黑方';
  const bestMove = review.bestMoveSan
    ? ` Stockfish 建议：${review.bestMoveSan}。`
    : '';
  const score = ` 评分：${review.scoreLabel}。`;

  return `第 ${review.moveNumber} 回合 ${side} ${review.playedSan}：${review.explanation}${bestMove}${score}`;
}

function summarizeSideReviews(
  sideLabel: string,
  reviews: MoveReview[],
  color: 'b' | 'w',
): SideReviewStats {
  const sideReviews = reviews.filter((review) => review.color === color);
  const best = sideReviews.filter((review) => review.grade === 'best').length;
  const unavailable = sideReviews.filter(
    (review) => review.grade === 'unavailable',
  ).length;
  const stockfishAnalyzed = sideReviews.length - unavailable;
  const overlapPercent =
    stockfishAnalyzed > 0
      ? Math.round((best / stockfishAnalyzed) * 100)
      : null;
  const label =
    overlapPercent === null
      ? `${sideLabel}重合度待分析`
      : `${sideLabel}重合度 ${overlapPercent}% (${best}/${stockfishAnalyzed})`;

  return {
    best,
    label,
    overlapPercent,
    stockfishAnalyzed,
    unavailable,
  };
}

function formatEngineScore(
  score: EngineScore | null,
  color: 'b' | 'w',
): string {
  if (!score) {
    return '暂无';
  }

  const whiteValue = color === 'w' ? score.value : -score.value;

  if (score.type === 'mate') {
    if (whiteValue > 0) {
      return `白方 ${whiteValue} 步内将杀`;
    }

    if (whiteValue < 0) {
      return `黑方 ${Math.abs(whiteValue)} 步内将杀`;
    }

    return '将杀';
  }

  const pawns = whiteValue / 100;
  const sign = pawns > 0 ? '+' : '';

  return `白方 ${sign}${pawns.toFixed(2)}`;
}
