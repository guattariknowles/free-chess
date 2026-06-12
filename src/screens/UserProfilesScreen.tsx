import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createUserProfile,
  type UserProfile,
} from '../game/userProfile';
import {
  deleteUserProfile,
  loadUserProfiles,
  saveUserProfile,
} from '../game/userProfileStorage';

type UserProfilesScreenProps = {
  onBack: () => void;
};

export function UserProfilesScreen({
  onBack,
}: UserProfilesScreenProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('正在读取本地档案…');

  useEffect(() => {
    loadUserProfiles()
      .then((loaded) => {
        setProfiles(loaded);
        setFeedback(
          loaded.length > 0
            ? `本机共有 ${loaded.length} 个档案`
            : '创建档案后，可为普通对局和系列赛选择玩家',
        );
      })
      .catch(() => setFeedback('读取本地档案失败'));
  }, []);

  const submit = async () => {
    try {
      const existing = profiles.find((profile) => profile.id === editingId);
      const profile = createUserProfile({
        createdAt: existing?.createdAt,
        id: existing?.id,
        name,
        notes: existing?.notes,
      });
      const next = await saveUserProfile(profile);

      setProfiles(next);
      setName('');
      setEditingId(null);
      setFeedback(existing ? '档案名称已更新' : '本地档案已创建');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '保存档案失败');
    }
  };

  const startRename = (profile: UserProfile) => {
    setEditingId(profile.id);
    setName(profile.name);
    setFeedback(`正在重命名“${profile.name}”`);
  };

  const confirmDelete = (profile: UserProfile) => {
    Alert.alert(
      `删除“${profile.name}”？`,
      '已保存棋谱和系列赛会保留当时的玩家姓名，但以后不能再选择此档案。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: async () => {
            try {
              const next = await deleteUserProfile(profile.id);
              setProfiles(next);

              if (editingId === profile.id) {
                setEditingId(null);
                setName('');
              }

              setFeedback('档案已删除');
            } catch {
              setFeedback('删除档案失败');
            }
          },
          style: 'destructive',
          text: '删除',
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>返回棋盘</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>PART 4</Text>
          <Text style={styles.title}>本地档案</Text>
        </View>
      </View>

      <View accessibilityLiveRegion="polite" style={styles.feedback}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          accessibilityLabel="档案名称"
          autoCorrect={false}
          maxLength={24}
          onChangeText={setName}
          onSubmitEditing={submit}
          placeholder="输入玩家名称"
          placeholderTextColor="#687068"
          style={styles.input}
          value={name}
        />
        <Pressable onPress={submit} style={styles.primaryButton}>
          <Text style={styles.primaryText}>
            {editingId ? '保存名称' : '创建档案'}
          </Text>
        </Pressable>
      </View>

      {editingId ? (
        <Pressable
          onPress={() => {
            setEditingId(null);
            setName('');
            setFeedback('已取消重命名');
          }}
          style={styles.cancelEdit}
        >
          <Text style={styles.cancelEditText}>取消重命名</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>本机玩家</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {profiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>暂无档案</Text>
            <Text style={styles.emptyText}>
              档案只保存在本机，不是联网账号。
            </Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <View key={profile.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileMeta}>
                  创建于 {formatDate(profile.createdAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => startRename(profile)}
                style={styles.smallButton}
              >
                <Text style={styles.smallText}>改名</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(profile)}
                style={styles.smallButton}
              >
                <Text style={styles.deleteText}>删除</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '日期未知'
    : date.toLocaleDateString('zh-CN');
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
  form: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#202420',
    borderColor: '#454d45',
    borderRadius: 9,
    borderWidth: 1,
    color: '#f4f1e8',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: '#fff7e8',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelEdit: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  cancelEditText: {
    color: '#d1a356',
    fontSize: 12,
    fontWeight: '700',
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
  emptyTitle: {
    color: '#d7d4cb',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#8f978e',
    fontSize: 12,
    marginTop: 6,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#242924',
    borderColor: '#3e453e',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 9,
    padding: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#465346',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: '#f4f1e8',
    fontSize: 17,
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
    marginLeft: 10,
  },
  profileName: {
    color: '#f2efe6',
    fontSize: 15,
    fontWeight: '800',
  },
  profileMeta: {
    color: '#8f978e',
    fontSize: 10,
    marginTop: 3,
  },
  smallButton: {
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  smallText: {
    color: '#d3d8d0',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteText: {
    color: '#e98576',
    fontSize: 11,
    fontWeight: '700',
  },
});
