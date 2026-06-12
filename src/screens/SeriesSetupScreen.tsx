import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type ClockConfig,
  getClockConfigLabel,
  NO_CLOCK_CONFIG,
} from '../game/clockState';
import { createSeries, type SeriesRecord } from '../game/series';
import type { UserProfile } from '../game/userProfile';
import { loadUserProfiles } from '../game/userProfileStorage';

type SeriesSetupScreenProps = {
  onBack: () => void;
  onStart: (series: SeriesRecord) => void;
};

const GAME_COUNTS = [2, 3, 4, 5, 6] as const;
const CLOCKS: Array<{ config: ClockConfig; label: string }> = [
  { config: NO_CLOCK_CONFIG, label: '无棋钟' },
  {
    config: { incrementMs: 0, initialTimeMs: 10 * 60_000 },
    label: '10+0',
  },
  {
    config: { incrementMs: 10_000, initialTimeMs: 15 * 60_000 },
    label: '15+10',
  },
];

export function SeriesSetupScreen({
  onBack,
  onStart,
}: SeriesSetupScreenProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [playerOneId, setPlayerOneId] = useState<string | null>(null);
  const [playerTwoId, setPlayerTwoId] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState(4);
  const [clockConfig, setClockConfig] =
    useState<ClockConfig>(NO_CLOCK_CONFIG);
  const [feedback, setFeedback] = useState('正在读取本地档案…');

  useEffect(() => {
    loadUserProfiles()
      .then((loaded) => {
        setProfiles(loaded);
        setPlayerOneId(loaded[0]?.id ?? null);
        setPlayerTwoId(loaded[1]?.id ?? null);
        setFeedback(
          loaded.length < 2
            ? '创建系列赛前，至少需要两个不同的本地档案'
            : '选择双方、固定局数和主赛棋钟',
        );
      })
      .catch(() => setFeedback('读取本地档案失败'));
  }, []);

  const start = () => {
    const playerOne = profiles.find(
      (profile) => profile.id === playerOneId,
    );
    const playerTwo = profiles.find(
      (profile) => profile.id === playerTwoId,
    );

    if (!playerOne || !playerTwo) {
      setFeedback('请选择两个本地档案');
      return;
    }

    try {
      onStart(
        createSeries({
          mainClockConfig: clockConfig,
          mainGameCount: gameCount,
          playerOne,
          playerTwo,
        }),
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '无法创建系列赛',
      );
    }
  };

  const oddWarning =
    gameCount % 2 === 1
      ? `BO${gameCount} 中一方会多执白一局。首局颜色将随机抽签。`
      : `BO${gameCount} 双方执白次数相同，更适合作为公平的固定局数赛。`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>返回棋盘</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>PART 4</Text>
          <Text style={styles.title}>创建系列赛</Text>
        </View>
      </View>

      <View accessibilityLiveRegion="polite" style={styles.feedback}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>第一位玩家</Text>
        <ProfileChoices
          blockedId={playerTwoId}
          onSelect={setPlayerOneId}
          profiles={profiles}
          selectedId={playerOneId}
        />

        <Text style={styles.sectionTitle}>第二位玩家</Text>
        <ProfileChoices
          blockedId={playerOneId}
          onSelect={setPlayerTwoId}
          profiles={profiles}
          selectedId={playerTwoId}
        />

        <Text style={styles.sectionTitle}>固定局数</Text>
        <View style={styles.choiceRow}>
          {GAME_COUNTS.map((count) => (
            <Choice
              active={gameCount === count}
              key={count}
              label={`BO${count}`}
              onPress={() => setGameCount(count)}
            />
          ))}
        </View>
        <View
          style={[
            styles.warning,
            gameCount % 2 === 0 && styles.fairWarning,
          ]}
        >
          <Text style={styles.warningText}>{oddWarning}</Text>
        </View>

        <Text style={styles.sectionTitle}>主赛棋钟</Text>
        <View style={styles.choiceRow}>
          {CLOCKS.map((clock) => (
            <Choice
              active={
                getClockConfigLabel(clockConfig) ===
                getClockConfigLabel(clock.config)
              }
              key={clock.label}
              label={clock.label}
              onPress={() => setClockConfig(clock.config)}
            />
          ))}
        </View>

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>计分与加赛</Text>
          <Text style={styles.rulesText}>
            每局胜 1 分、和棋 0.5 分、负 0 分。固定局数结束同分时，先进行
            2 局 10+5 快棋，再进行 2 局 3+2 超快棋；仍同分则继续单局
            3+2，逐局换色，直到出现胜负。
          </Text>
        </View>

        <Pressable
          disabled={profiles.length < 2}
          onPress={start}
          style={[
            styles.startButton,
            profiles.length < 2 && styles.disabled,
          ]}
        >
          <Text style={styles.startText}>抽签并开始第一局</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

type ProfileChoicesProps = {
  blockedId: string | null;
  onSelect: (id: string) => void;
  profiles: UserProfile[];
  selectedId: string | null;
};

function ProfileChoices({
  blockedId,
  onSelect,
  profiles,
  selectedId,
}: ProfileChoicesProps) {
  return (
    <View style={styles.profileGrid}>
      {profiles.map((profile) => {
        const blocked = profile.id === blockedId;
        const selected = profile.id === selectedId;

        return (
          <Pressable
            disabled={blocked}
            key={profile.id}
            onPress={() => onSelect(profile.id)}
            style={[
              styles.profileChoice,
              selected && styles.activeChoice,
              blocked && styles.disabled,
            ]}
          >
            <Text style={styles.profileName}>{profile.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Choice({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, active && styles.activeChoice]}
    >
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
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
    gap: 14,
  },
  backButton: {
    borderColor: '#424a42',
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backText: {
    color: '#e5e2d9',
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#d49a43',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: '#f4f1e8',
    fontSize: 25,
    fontWeight: '900',
  },
  feedback: {
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    padding: 11,
  },
  feedbackText: {
    color: '#b8bfb6',
    fontSize: 12,
  },
  content: {
    paddingBottom: 30,
  },
  sectionTitle: {
    color: '#e7e4db',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 18,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileChoice: {
    alignItems: 'center',
    borderColor: '#454d45',
    borderRadius: 9,
    borderWidth: 1,
    minWidth: '31%',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  profileName: {
    color: '#f0ede4',
    fontSize: 12,
    fontWeight: '800',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 7,
  },
  choice: {
    alignItems: 'center',
    borderColor: '#454d45',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 11,
  },
  activeChoice: {
    backgroundColor: '#8c6230',
    borderColor: '#d49a43',
  },
  choiceText: {
    color: '#f0ede4',
    fontSize: 11,
    fontWeight: '800',
  },
  warning: {
    backgroundColor: '#3a2d20',
    borderColor: '#8c6230',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 9,
    padding: 10,
  },
  fairWarning: {
    backgroundColor: '#203426',
    borderColor: '#4c7857',
  },
  warningText: {
    color: '#d9c7aa',
    fontSize: 11,
    lineHeight: 17,
  },
  rulesCard: {
    backgroundColor: '#222722',
    borderColor: '#343b34',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 20,
    padding: 12,
  },
  rulesTitle: {
    color: '#f2efe6',
    fontSize: 13,
    fontWeight: '800',
  },
  rulesText: {
    color: '#a7afa5',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 50,
  },
  startText: {
    color: '#fff7e8',
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.35,
  },
});
