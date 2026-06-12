import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type SeriesRecord,
  isSeriesRecord,
} from './series';

const STORAGE_KEY = '@free-chess/series-library/v1';

export async function loadSeriesRecords(): Promise<SeriesRecord[]> {
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
      .filter(isSeriesRecord)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveSeriesRecord(
  series: SeriesRecord,
): Promise<SeriesRecord[]> {
  const records = await loadSeriesRecords();
  const nextSeries = {
    ...series,
    updatedAt: new Date().toISOString(),
  };
  const nextRecords = [
    nextSeries,
    ...records.filter((item) => item.id !== series.id),
  ];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function deleteSeriesRecord(
  id: string,
): Promise<SeriesRecord[]> {
  const records = await loadSeriesRecords();
  const nextRecords = records.filter((series) => series.id !== id);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function loadActiveSeries(): Promise<SeriesRecord | null> {
  const records = await loadSeriesRecords();
  return records.find((series) => series.status === 'active') ?? null;
}
