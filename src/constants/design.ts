// 앱 전반에서 쓰는 디자인/동작 상수. 값은 한 곳에서만 관리한다.

export const APP_NAME = "Bookmark";

/** 기본 파스텔 색상 팔레트 (키 = 색상 id, 값 = HEX) */
export const PASTEL_PALETTE = {
  yellow: "#fde68a",
  green: "#bbf7d0",
  sky: "#bae6fd",
  purple: "#ddd6fe",
  pink: "#fbcfe8",
  orange: "#fed7aa",
  gray: "#e5e7eb",
} as const;

export type PaletteColorId = keyof typeof PASTEL_PALETTE;

export const DEFAULT_NOTE_COLOR = PASTEL_PALETTE.yellow;

/** 책갈피 크기 프리셋 (설정: 작게/보통/크게) */
export type BookmarkSize = "small" | "normal" | "large";

export const BOOKMARK_SIZES: Record<
  BookmarkSize,
  { width: number; primaryHeight: number; itemHeight: number }
> = {
  small: { width: 22, primaryHeight: 56, itemHeight: 42 },
  normal: { width: 26, primaryHeight: 68, itemHeight: 52 },
  large: { width: 30, primaryHeight: 80, itemHeight: 62 },
};

/** 메모 패널 */
export const PANEL_DEFAULT_WIDTH = 420;
export const PANEL_MIN_WIDTH = 320;
export const PANEL_MAX_WIDTH = 720;

/** edge 창 레이아웃 (논리 px). 평소엔 리본 폭만 차지해 클릭 방해를 최소화한다. */
export const RIBBON_COLUMN_WIDTH = 28;
export const EDGE_COLLAPSED_HEIGHT = 320;
export const EDGE_EXPANDED_HEIGHT = 560;

/** 애니메이션 (180~260ms 범위) */
export const PANEL_MOTION_MS = 220;

/** 투명도 (0~1). 너무 투명해 안 보이는 것을 막기 위해 최소값을 둔다. */
export const OPACITY_MIN = 0.4;
export const OPACITY_MAX = 1;
export const DEFAULT_BOOKMARK_OPACITY = 1;
export const DEFAULT_PANEL_OPACITY = 1;

/** 기본 전역 단축키 (메인 창 토글) */
export const DEFAULT_HOTKEY = "CommandOrControl+Shift+B";

/** 자동 저장 디바운스 */
export const AUTOSAVE_DEBOUNCE_MS = 500;
