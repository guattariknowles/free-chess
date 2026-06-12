import type { Square } from 'chess.js';
import { useMemo, useState, type ReactNode } from 'react';
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
  type ChessLesson,
  getLessonsByCategory,
  LESSON_CATEGORY_LABELS,
  type LessonCategory,
  LESSONS,
} from '../data/lessons/lessonCatalog';
import { ChessGame } from '../game/chessState';

type LearnScreenProps = {
  onBack: () => void;
};

const CATEGORIES: LessonCategory[] = [
  'basics',
  'openings',
  'strategy',
  'endgames',
];

export function LearnScreen({ onBack }: LearnScreenProps) {
  const [category, setCategory] = useState<LessonCategory>('basics');
  const [selectedLesson, setSelectedLesson] =
    useState<ChessLesson | null>(null);

  if (selectedLesson) {
    return (
      <LessonDetail
        lesson={selectedLesson}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  const lessons = getLessonsByCategory(category);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>返回棋盘</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>PART 5 · 离线课程</Text>
          <Text style={styles.title}>学习国际象棋</Text>
          <Text style={styles.subtitle}>
            {LESSONS.length} 节原创课程，无需联网
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.categoryBar}
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[
              styles.categoryButton,
              item === category && styles.activeCategoryButton,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                item === category && styles.activeCategoryText,
              ]}
            >
              {LESSON_CATEGORY_LABELS[item]}
            </Text>
            <Text style={styles.categoryCount}>
              {getLessonsByCategory(item).length} 节
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>
          {LESSON_CATEGORY_LABELS[category]}
        </Text>
        <Text style={styles.sectionHint}>点击查看棋盘示例和原因</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.lessonList}
        showsVerticalScrollIndicator={false}
      >
        {lessons.map((lesson, index) => (
          <Pressable
            key={lesson.id}
            onPress={() => setSelectedLesson(lesson)}
            style={({ pressed }) => [
              styles.lessonCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.lessonNumber}>
              <Text style={styles.lessonNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.lessonCardText}>
              <View style={styles.lessonTitleRow}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.level}>{lesson.level}</Text>
              </View>
              <Text style={styles.lessonSummary}>{lesson.summary}</Text>
              <Text numberOfLines={2} style={styles.lessonWhy}>
                为什么：{lesson.why}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function LessonDetail({
  lesson,
  onBack,
}: {
  lesson: ChessLesson;
  onBack: () => void;
}) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(
    null,
  );
  const [flipped, setFlipped] = useState(false);
  const { height, width } = useWindowDimensions();
  const snapshot = useMemo(
    () => new ChessGame(lesson.fen).getSnapshot(),
    [lesson.fen],
  );
  const boardSize = Math.floor(
    Math.min(width - 32, Math.max(232, height * 0.42), 440),
  );
  const selectedPiece = selectedSquare
    ? snapshot.board.find((piece) => piece.square === selectedSquare)
    : undefined;
  const selectionText = selectedSquare
    ? `${selectedSquare}${
        selectedPiece
          ? `：${selectedPiece.color === 'w' ? '白方' : '黑方'}棋子`
          : '：空格'
      }`
    : '点击棋盘格子，可查看它的坐标';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>返回课程</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {LESSON_CATEGORY_LABELS[lesson.category]} · {lesson.level}
            </Text>
            <Text style={styles.title}>{lesson.title}</Text>
          </View>
        </View>

        <Text style={styles.detailSummary}>{lesson.summary}</Text>

        <View style={styles.boardWrap}>
          <ChessBoard
            board={snapshot.board}
            flipped={flipped}
            highlightedSquares={
              lesson.recommended
                ? [lesson.recommended.from, lesson.recommended.to]
                : []
            }
            lastMove={null}
            legalMoves={[]}
            onSquarePress={setSelectedSquare}
            selectedSquare={selectedSquare}
            size={boardSize}
          />
        </View>

        <View accessibilityLiveRegion="polite" style={styles.coordinateCard}>
          <Text style={styles.coordinateText}>{selectionText}</Text>
          <Pressable
            onPress={() => {
              setFlipped((value) => !value);
              setSelectedSquare(null);
            }}
            style={styles.flipButton}
          >
            <Text style={styles.flipButtonText}>翻转示例</Text>
          </Pressable>
        </View>

        <TeachingCard label="为什么要学">
          <Text style={styles.cardBody}>{lesson.why}</Text>
        </TeachingCard>

        <TeachingCard label="记住这些">
          {lesson.points.map((point) => (
            <View key={point} style={styles.pointRow}>
              <View style={styles.pointDot} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </TeachingCard>

        {lesson.recommended ? (
          <TeachingCard label={`推荐走法 · ${lesson.recommended.label}`}>
            <Text style={styles.recommendedText}>
              {lesson.recommended.explanation}
            </Text>
          </TeachingCard>
        ) : null}

        {lesson.mistake ? (
          <TeachingCard label={`常见问题 · ${lesson.mistake.label}`} warning>
            <Text style={styles.mistakeText}>
              {lesson.mistake.explanation}
            </Text>
          </TeachingCard>
        ) : null}

        <View style={styles.sourceCard}>
          <Text style={styles.sourceTitle}>内容说明</Text>
          <Text style={styles.sourceText}>
            本课程为 Free Chess 原创入门讲解，不复制第三方课程或书籍原文。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function TeachingCard({
  children,
  label,
  warning = false,
}: {
  children: ReactNode;
  label: string;
  warning?: boolean;
}) {
  return (
    <View style={[styles.teachingCard, warning && styles.warningCard]}>
      <Text
        style={[styles.cardLabel, warning && styles.warningCardLabel]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#171a18', flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 44,
  },
  outlineButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  outlineButtonText: { color: '#e5e2d9', fontSize: 11, fontWeight: '700' },
  headerText: { flex: 1, marginLeft: 14 },
  eyebrow: {
    color: '#d49a43',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: { color: '#f4f1e8', fontSize: 24, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#8f978e', fontSize: 10, marginTop: 2 },
  categoryBar: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  categoryButton: {
    backgroundColor: '#222722',
    borderColor: '#3a423a',
    borderRadius: 11,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  activeCategoryButton: { backgroundColor: '#6f4d25', borderColor: '#d49a43' },
  categoryText: { color: '#c7cdc4', fontSize: 12, fontWeight: '800' },
  activeCategoryText: { color: '#fff3df' },
  categoryCount: { color: '#8f978e', fontSize: 9, marginTop: 2 },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionTitle: { color: '#f1eee5', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: '#7f877f', fontSize: 9 },
  lessonList: { paddingBottom: 28, paddingHorizontal: 16, paddingTop: 10 },
  lessonCard: {
    alignItems: 'center',
    backgroundColor: '#242924',
    borderColor: '#3b433b',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    minHeight: 104,
    padding: 12,
  },
  lessonNumber: {
    alignItems: 'center',
    backgroundColor: '#343b34',
    borderRadius: 99,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  lessonNumberText: { color: '#d9a65a', fontSize: 13, fontWeight: '900' },
  lessonCardText: { flex: 1, marginLeft: 11 },
  lessonTitleRow: { alignItems: 'center', flexDirection: 'row' },
  lessonTitle: { color: '#f3f0e7', flex: 1, fontSize: 15, fontWeight: '900' },
  level: { color: '#d5a45b', fontSize: 9, fontWeight: '800' },
  lessonSummary: { color: '#afb6ad', fontSize: 11, lineHeight: 16, marginTop: 4 },
  lessonWhy: { color: '#747c74', fontSize: 9, lineHeight: 14, marginTop: 4 },
  chevron: { color: '#b77d34', fontSize: 27, marginLeft: 7 },
  pressed: { opacity: 0.7 },
  detailContent: { paddingBottom: 32 },
  detailSummary: {
    color: '#aeb5ac',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  boardWrap: { alignItems: 'center', paddingVertical: 14 },
  coordinateCard: {
    alignItems: 'center',
    backgroundColor: '#222722',
    borderColor: '#3b433b',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    minHeight: 46,
    paddingHorizontal: 11,
  },
  coordinateText: { color: '#d8ddd4', flex: 1, fontSize: 11 },
  flipButton: {
    borderColor: '#515951',
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  flipButtonText: { color: '#d6a45a', fontSize: 10, fontWeight: '800' },
  teachingCard: {
    backgroundColor: '#242924',
    borderColor: '#3c443c',
    borderRadius: 11,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 13,
  },
  warningCard: { borderColor: '#704a3e' },
  cardLabel: { color: '#d7a65c', fontSize: 12, fontWeight: '900', marginBottom: 7 },
  warningCardLabel: { color: '#e58b75' },
  cardBody: { color: '#d4d9d1', fontSize: 12, lineHeight: 19 },
  pointRow: { flexDirection: 'row', marginBottom: 6 },
  pointDot: {
    backgroundColor: '#d49a43',
    borderRadius: 99,
    height: 6,
    marginRight: 9,
    marginTop: 6,
    width: 6,
  },
  pointText: { color: '#c9cfc6', flex: 1, fontSize: 12, lineHeight: 18 },
  recommendedText: { color: '#dce6d8', fontSize: 12, lineHeight: 19 },
  mistakeText: { color: '#dbb3a8', fontSize: 12, lineHeight: 19 },
  sourceCard: {
    borderColor: '#353c35',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
  },
  sourceTitle: { color: '#969e95', fontSize: 10, fontWeight: '800' },
  sourceText: { color: '#737b73', fontSize: 10, lineHeight: 16, marginTop: 4 },
});
