import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  APP_THEMES,
  BOARD_SKINS,
  DEFAULT_APPEARANCE_SETTINGS,
  PIECE_SKINS,
} from './skins';
import {
  loadAppearanceSettings,
  saveAppearanceSettings,
} from './storage';
import type {
  AppearanceSettings,
  AppTheme,
  BoardSkin,
  BoardSkinId,
  PieceSkin,
  PieceSkinId,
  ThemeId,
} from './types';

type ThemeContextValue = {
  appTheme: AppTheme;
  boardSkin: BoardSkin;
  pieceSkin: PieceSkin;
  ready: boolean;
  setAppThemeId: (appThemeId: ThemeId) => void;
  setBoardSkinId: (boardSkinId: BoardSkinId) => void;
  setPieceSkinId: (pieceSkinId: PieceSkinId) => void;
  settings: AppearanceSettings;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppearanceSettings>(
    DEFAULT_APPEARANCE_SETTINGS,
  );

  useEffect(() => {
    let active = true;

    loadAppearanceSettings()
      .then((loaded) => {
        if (active) {
          setSettings(loaded);
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = (next: AppearanceSettings) => {
    setSettings(next);
    saveAppearanceSettings(next).catch(() => undefined);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      appTheme: APP_THEMES[settings.appThemeId],
      boardSkin: BOARD_SKINS[settings.boardSkinId],
      pieceSkin: PIECE_SKINS[settings.pieceSkinId],
      ready,
      setAppThemeId: (appThemeId) =>
        persist({
          ...settings,
          appThemeId,
        }),
      setBoardSkinId: (boardSkinId) =>
        persist({
          ...settings,
          boardSkinId,
        }),
      setPieceSkinId: (pieceSkinId) =>
        persist({
          ...settings,
          pieceSkinId,
        }),
      settings,
    }),
    [ready, settings],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return value;
}
