import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  APP_THEMES,
  BOARD_SKINS,
  DEFAULT_APPEARANCE_SETTINGS,
  PIECE_SKINS,
} from './skins';
import type { AppearanceSettings } from './types';

const STORAGE_KEY = 'free-chess:appearance-settings:v1';

function isAppearanceSettings(value: unknown): value is AppearanceSettings {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AppearanceSettings>;

  return (
    typeof candidate.appThemeId === 'string' &&
    candidate.appThemeId in APP_THEMES &&
    typeof candidate.boardSkinId === 'string' &&
    candidate.boardSkinId in BOARD_SKINS &&
    typeof candidate.pieceSkinId === 'string' &&
    candidate.pieceSkinId in PIECE_SKINS
  );
}

export async function loadAppearanceSettings(): Promise<AppearanceSettings> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return DEFAULT_APPEARANCE_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored);

    if (isAppearanceSettings(parsed)) {
      return parsed;
    }
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }

  return DEFAULT_APPEARANCE_SETTINGS;
}

export async function saveAppearanceSettings(
  settings: AppearanceSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
