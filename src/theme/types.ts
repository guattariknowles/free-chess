import type { Color, PieceSymbol } from 'chess.js';

export type ThemeId =
  | 'minimalTournament'
  | 'impressionistStudy'
  | 'constructivistBoardroom'
  | 'steampunkAtelier'
  | 'cyberAnime';

export type BoardSkinId =
  | 'minimalTournament'
  | 'classicWood'
  | 'impressionistBlocks'
  | 'constructivistGeometry'
  | 'suprematistRed'
  | 'steampunkCopper'
  | 'cyberNeon'
  | 'renaissanceOil'
  | 'ukiyoWoodblock'
  | 'inkWash'
  | 'artNouveauGlass'
  | 'animeFresh';

export type PieceSkinId =
  | 'classicSerif'
  | 'tournamentInk'
  | 'copperEtched'
  | 'neonGlyph'
  | 'softAnime'
  | 'teachingLarge';

export type AppTheme = {
  accent: string;
  accentMuted: string;
  accentStrong: string;
  backdrop: string;
  border: string;
  danger: string;
  disabledBg: string;
  disabledBorder: string;
  disabledText: string;
  elevated: string;
  id: ThemeId;
  label: string;
  mutedText: string;
  navigation: string;
  navigationActive: string;
  onAccent: string;
  overlay: string;
  panel: string;
  pressedOpacity: number;
  screen: string;
  subtleText: string;
  surface: string;
  text: string;
  warning: string;
};

export type BoardSkin = {
  border: string;
  captureTarget: string;
  coordinateDark: string;
  coordinateLight: string;
  darkSquare: string;
  description: string;
  id: BoardSkinId;
  label: string;
  lastMove: string;
  lightSquare: string;
  moveTarget: string;
  problem: string;
  selected: string;
};

export type PieceSkin = {
  black: string;
  blackShadow: string;
  family: string;
  id: PieceSkinId;
  label: string;
  symbols: Record<Color, Record<PieceSymbol, string>>;
  white: string;
  whiteShadow: string;
};

export type AppearanceSettings = {
  appThemeId: ThemeId;
  boardSkinId: BoardSkinId;
  pieceSkinId: PieceSkinId;
};
