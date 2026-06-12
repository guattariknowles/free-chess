import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createGameRecord,
  type GameRecord,
  getResultLabel,
} from '../game/gameRecord';
import {
  deleteGameRecord,
  loadGameRecords,
  saveGameRecord,
} from '../game/gameLibraryStorage';
import {
  getSeriesResultLabel,
  type SeriesRecord,
} from '../game/series';
import {
  deleteSeriesRecord,
  loadSeriesRecords,
} from '../game/seriesStorage';

type GameLibraryScreenProps = {
  canSaveCurrent: boolean;
  onBack: () => void;
  onBuildCurrentRecord: () => GameRecord;
  onOpenRecord: (record: GameRecord) => void;
  onOpenSeries: (series: SeriesRecord) => void;
};

export function GameLibraryScreen({
  canSaveCurrent,
  onBack,
  onBuildCurrentRecord,
  onOpenRecord,
  onOpenSeries,
}: GameLibraryScreenProps) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [seriesRecords, setSeriesRecords] = useState<SeriesRecord[]>([]);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [feedback, setFeedback] = useState('正在读取本地棋谱…');

  useEffect(() => {
    let active = true;

    Promise.all([loadGameRecords(), loadSeriesRecords()])
      .then(([loaded, loadedSeries]) => {
        if (active) {
          setRecords(loaded);
          setSeriesRecords(loadedSeries);
          const total = loaded.length + loadedSeries.length;
          setFeedback(
            total > 0
              ? `本机已保存 ${loaded.length} 盘单局和 ${loadedSeries.length} 组系列赛`
              : '本机还没有保存棋谱',
          );
        }
      })
      .catch(() => {
        if (active) {
          setFeedback('读取本地棋谱失败');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const saveCurrent = async () => {
    try {
      const record = onBuildCurrentRecord();
      const nextRecords = await saveGameRecord(record);
      setRecords(nextRecords);
      setFeedback('当前棋局已保存到本机');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '保存当前棋局失败',
      );
    }
  };

  const copyCurrent = async () => {
    try {
      const record = onBuildCurrentRecord();
      await Clipboard.setStringAsync(record.pgn);
      setFeedback('当前棋局的 PGN 已复制');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '复制 PGN 失败',
      );
    }
  };

  const importPgn = async () => {
    setImportError('');

    try {
      const record = createGameRecord({
        clockLabel: '导入棋谱',
        pgn: importText,
        source: 'imported',
      });
      const nextRecords = await saveGameRecord(record);

      setRecords(nextRecords);
      setImportText('');
      setImportVisible(false);
      setFeedback('PGN 已导入并保存');
      onOpenRecord(record);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : '导入 PGN 失败',
      );
    }
  };

  const copyRecord = async (record: GameRecord) => {
    await Clipboard.setStringAsync(record.pgn);
    setFeedback('所选棋谱的 PGN 已复制');
  };

  const confirmDelete = (record: GameRecord) => {
    Alert.alert('删除棋谱？', '删除后无法恢复。', [
      { style: 'cancel', text: '取消' },
      {
        onPress: async () => {
          try {
            const nextRecords = await deleteGameRecord(record.id);
            setRecords(nextRecords);
            setFeedback('棋谱已删除');
          } catch {
            setFeedback('删除棋谱失败');
          }
        },
        style: 'destructive',
        text: '删除',
      },
    ]);
  };

  const confirmDeleteSeries = (series: SeriesRecord) => {
    Alert.alert(
      '删除整组系列赛？',
      `将同时删除其中 ${series.games.length} 盘棋，删除后无法恢复。`,
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: async () => {
            try {
              const next = await deleteSeriesRecord(series.id);
              setSeriesRecords(next);
              setFeedback('系列赛及其全部单局已删除');
            } catch {
              setFeedback('删除系列赛失败');
            }
          },
          style: 'destructive',
          text: '删除整组',
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>返回棋盘</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>PART 3 + 4</Text>
          <Text style={styles.title}>本地棋谱</Text>
        </View>
      </View>

      <View accessibilityLiveRegion="polite" style={styles.feedbackPanel}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>

      <View style={styles.actionGrid}>
        <LibraryAction
          disabled={!canSaveCurrent}
          label="保存当前棋局"
          onPress={saveCurrent}
        />
        <LibraryAction
          disabled={!canSaveCurrent}
          label="复制当前 PGN"
          onPress={copyCurrent}
        />
        <LibraryAction
          label="导入 PGN"
          onPress={() => {
            setImportError('');
            setImportVisible(true);
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>系列赛</Text>
        {seriesRecords.length === 0 ? (
          <View style={styles.compactEmptyCard}>
            <Text style={styles.emptyText}>暂无系列赛记录</Text>
          </View>
        ) : (
          seriesRecords.map((series) => (
            <View key={series.id} style={styles.recordCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenSeries(series)}
                style={({ pressed }) => [
                  styles.recordMain,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.recordHeading}>
                  <Text numberOfLines={1} style={styles.recordTitle}>
                    {series.title}
                  </Text>
                  <Text style={styles.result}>
                    {series.status === 'active' ? '进行中' : '已结束'}
                  </Text>
                </View>
                <Text style={styles.recordMeta}>
                  {getSeriesResultLabel(series)} · 已完成{' '}
                  {series.games.length} 局
                </Text>
                <Text style={styles.recordSource}>
                  首局颜色已保存 · 每局自动换色
                </Text>
              </Pressable>
              <View style={styles.recordActions}>
                <SmallAction
                  label="查看整组"
                  onPress={() => onOpenSeries(series)}
                />
                <SmallAction
                  danger
                  label="删除整组"
                  onPress={() => confirmDeleteSeries(series)}
                />
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>独立棋局</Text>
        {records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>暂无棋谱</Text>
            <Text style={styles.emptyText}>
              完成一盘棋后会自动保存，也可以保存进行中的棋局。
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenRecord(record)}
                style={({ pressed }) => [
                  styles.recordMain,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.recordHeading}>
                  <Text numberOfLines={1} style={styles.recordTitle}>
                    {record.title}
                  </Text>
                  <Text style={styles.result}>
                    {getResultLabel(record.result)}
                  </Text>
                </View>
                <Text style={styles.recordMeta}>
                  {formatRecordDate(record.createdAt)} · {record.moveCount} 步
                  {' · '}
                  {record.clockLabel}
                </Text>
                <Text style={styles.recordSource}>
                  {record.source === 'imported' ? 'PGN 导入' : '本机对局'}
                </Text>
              </Pressable>
              <View style={styles.recordActions}>
                <SmallAction
                  label="复制"
                  onPress={() => copyRecord(record)}
                />
                <SmallAction
                  danger
                  label="删除"
                  onPress={() => confirmDelete(record)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setImportVisible(false)}
        transparent
        visible={importVisible}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.dialogTitle}>导入 PGN</Text>
            <Text style={styles.dialogDescription}>
              粘贴完整 PGN。应用会检查格式和每一步是否合法。
            </Text>
            <TextInput
              accessibilityLabel="PGN 内容"
              autoCapitalize="none"
              multiline
              onChangeText={setImportText}
              placeholder={'[Event "示例"]\n\n1. e4 e5 2. Nf3'}
              placeholderTextColor="#687068"
              style={styles.pgnInput}
              textAlignVertical="top"
              value={importText}
            />
            {importError ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {importError}
              </Text>
            ) : null}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setImportVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={importPgn}
                style={styles.importButton}
              >
                <Text style={styles.importText}>检查并导入</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatRecordDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '日期未知';
  }

  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type ActionProps = {
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

function LibraryAction({
  disabled = false,
  label,
  onPress,
}: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.libraryAction,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.libraryActionText,
          disabled && styles.disabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SmallAction({
  danger = false,
  label,
  onPress,
}: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallAction,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.smallActionText,
          danger && styles.dangerActionText,
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
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backButtonText: {
    color: '#e5e2d9',
    fontSize: 12,
    fontWeight: '700',
  },
  headerText: {
    marginLeft: 14,
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
  feedbackPanel: {
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
  actionGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  libraryAction: {
    alignItems: 'center',
    backgroundColor: '#303630',
    borderColor: '#454d45',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 5,
  },
  libraryActionText: {
    color: '#f0ede4',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabled: {
    backgroundColor: '#202420',
    borderColor: '#2d322d',
  },
  disabledText: {
    color: '#606760',
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
  compactEmptyCard: {
    alignItems: 'center',
    borderColor: '#343b34',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 9,
    padding: 14,
  },
  emptyTitle: {
    color: '#d7d4cb',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#8f978e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: '#242924',
    borderColor: '#3e453e',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 9,
    overflow: 'hidden',
  },
  recordMain: {
    padding: 14,
  },
  recordHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordTitle: {
    color: '#f2efe6',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  result: {
    color: '#d7a95e',
    fontSize: 11,
    fontWeight: '800',
  },
  recordMeta: {
    color: '#a1a99f',
    fontSize: 11,
    marginTop: 6,
  },
  recordSource: {
    color: '#737b73',
    fontSize: 10,
    marginTop: 3,
  },
  recordActions: {
    borderColor: '#373e37',
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  smallAction: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
  },
  smallActionText: {
    color: '#d3d8d0',
    fontSize: 11,
    fontWeight: '700',
  },
  dangerActionText: {
    color: '#e98576',
  },
  pressed: {
    opacity: 0.68,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#242924',
    borderColor: '#4a5149',
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 500,
    padding: 18,
    width: '100%',
  },
  dialogTitle: {
    color: '#f4f1e8',
    fontSize: 21,
    fontWeight: '900',
  },
  dialogDescription: {
    color: '#aeb5ac',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  pgnInput: {
    backgroundColor: '#171a18',
    borderColor: '#4a5149',
    borderRadius: 9,
    borderWidth: 1,
    color: '#f4f1e8',
    fontFamily: 'monospace',
    fontSize: 12,
    height: 220,
    marginTop: 14,
    padding: 12,
  },
  error: {
    color: '#ef725f',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: '#454d45',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelText: {
    color: '#c4cac1',
    fontSize: 13,
    fontWeight: '700',
  },
  importButton: {
    alignItems: 'center',
    backgroundColor: '#b8792c',
    borderRadius: 9,
    flex: 2,
    justifyContent: 'center',
    minHeight: 46,
  },
  importText: {
    color: '#fff7e8',
    fontSize: 13,
    fontWeight: '800',
  },
});
