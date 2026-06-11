import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type GameRecord,
  isGameRecord,
} from './gameRecord';

const STORAGE_KEY = '@free-chess/game-library/v1';

export async function loadGameRecords(): Promise<GameRecord[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isGameRecord)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveGameRecord(
  record: GameRecord,
): Promise<GameRecord[]> {
  const records = await loadGameRecords();
  const nextRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  const nextRecords = [
    nextRecord,
    ...records.filter((item) => item.id !== record.id),
  ];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function deleteGameRecord(id: string): Promise<GameRecord[]> {
  const records = await loadGameRecords();
  const nextRecords = records.filter((record) => record.id !== id);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}
