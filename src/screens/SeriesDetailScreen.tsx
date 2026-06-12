import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { GameRecord } from '../game/gameRecord';
import {
  getSeriesPlayerName,
  getSeriesResultLabel,
  getSeriesScores,
  getSeriesStageLabel,
  type SeriesRecord,
} from '../game/series';

type SeriesDetailScreenProps = {
  onBack: () => void;
  onOpenGame: (record: GameRecord) => void;
  onResume?: (series: SeriesRecord) => void;
  series: SeriesRecord;
};

export function SeriesDetailScreen({
  onBack,
  onOpenGame,
  onResume,
  series,
}: SeriesDetailScreenProps) {
  const scores = getSeriesScores(series);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>返回棋谱库</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>系列赛</Text>
          <Text numberOfLines={1} style={styles.title}>
            {series.title}
          </Text>
        </View>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.playerScore}>
          <Text style={styles.playerName}>{series.playerOne.name}</Text>
          <Text style={styles.score}>{scores.playerOne}</Text>
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.playerScore}>
          <Text style={styles.playerName}>{series.playerTwo.name}</Text>
          <Text style={styles.score}>{scores.playerTwo}</Text>
        </View>
        <Text style={styles.result}>{getSeriesResultLabel(series)}</Text>
      </View>

      {series.status === 'active' && onResume ? (
        <Pressable
          onPress={() => onResume(series)}
          style={styles.resumeButton}
        >
          <Text style={styles.resumeText}>继续当前系列赛</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>全部单局</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {series.games.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>系列赛尚未完成任何单局</Text>
          </View>
        ) : (
          series.games.map((game) => (
            <Pressable
              key={game.record.id}
              onPress={() => onOpenGame(game.record)}
              style={styles.gameCard}
            >
              <View style={styles.gameHeading}>
                <Text style={styles.gameTitle}>
                  第 {game.gameNumber} 局 · {getSeriesStageLabel(game.stage)}
                </Text>
                <Text style={styles.gameResult}>{game.record.result}</Text>
              </View>
              <Text style={styles.gamePlayers}>
                白：{getSeriesPlayerName(series, game.whiteProfileId)}
                {'  '}黑：{getSeriesPlayerName(series, game.blackProfileId)}
              </Text>
              <Text style={styles.gameMeta}>
                {game.record.moveCount} 步 · {game.record.clockLabel}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#171a18',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  backButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  backText: {
    color: '#e5e2d9',
    fontSize: 11,
    fontWeight: '700',
  },
  heading: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    color: '#d49a43',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f4f1e8',
    fontSize: 20,
    fontWeight: '900',
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#242924',
    borderColor: '#3e453e',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    padding: 14,
  },
  playerScore: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    color: '#d8ddd5',
    fontSize: 12,
    fontWeight: '700',
  },
  score: {
    color: '#f5f1e7',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 3,
  },
  colon: {
    color: '#8c938b',
    fontSize: 28,
    fontWeight: '800',
  },
  result: {
    bottom: 5,
    color: '#d1a356',
    fontSize: 10,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  resumeButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 9,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 46,
  },
  resumeText: {
    color: '#fff7e8',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#e7e4db',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 20,
  },
  list: {
    paddingBottom: 28,
    paddingTop: 9,
  },
  emptyCard: {
    alignItems: 'center',
    borderColor: '#343b34',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 24,
  },
  emptyText: {
    color: '#8f978e',
    fontSize: 12,
  },
  gameCard: {
    backgroundColor: '#242924',
    borderColor: '#3e453e',
    borderRadius: 11,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  gameHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameTitle: {
    color: '#f2efe6',
    fontSize: 13,
    fontWeight: '800',
  },
  gameResult: {
    color: '#d7a95e',
    fontSize: 11,
    fontWeight: '800',
  },
  gamePlayers: {
    color: '#b4bbb2',
    fontSize: 11,
    marginTop: 6,
  },
  gameMeta: {
    color: '#747c74',
    fontSize: 10,
    marginTop: 3,
  },
});
