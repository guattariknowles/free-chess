import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type CustomPosition,
  isCustomPosition,
} from './customPosition';

const STORAGE_KEY = '@free-chess/custom-positions/v1';

export async function loadCustomPositions(): Promise<CustomPosition[]> {
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
      .filter(isCustomPosition)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function saveCustomPosition(
  position: CustomPosition,
): Promise<CustomPosition[]> {
  const positions = await loadCustomPositions();
  const nextPosition = {
    ...position,
    updatedAt: new Date().toISOString(),
  };
  const nextPositions = [
    nextPosition,
    ...positions.filter((item) => item.id !== position.id),
  ];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPositions));
  return nextPositions;
}

export async function deleteCustomPosition(
  id: string,
): Promise<CustomPosition[]> {
  const positions = await loadCustomPositions();
  const nextPositions = positions.filter((position) => position.id !== id);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextPositions));
  return nextPositions;
}
