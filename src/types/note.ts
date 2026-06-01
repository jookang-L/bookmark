// 메모 도메인 타입. 명세 5-1 기준이며 이후 Phase에서 DB 스키마와 일치시킨다.

export type Importance = "low" | "normal" | "important" | "critical";

export interface Note {
  id: string;
  title: string;
  /** 본문: TipTap(ProseMirror) JSON 문자열 */
  content: string;
  /** 검색/미리보기용 평문 (content에서 추출) */
  contentText: string;
  /** 정렬/필터에 쓰는 메모 날짜 (ISO) */
  noteDate: string;
  createdAt: string;
  updatedAt: string;
  importance: Importance;
  showAsBookmark: boolean;
  bookmarkOrder: number | null;
  /** 메모 색상 (HEX) */
  color: string;
  /** 0~1 투명도 */
  opacity: number;
  panelWidth: number;
  isPanelPinned: boolean;
  isArchived: boolean;
  deletedAt: string | null;
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  low: "낮음",
  normal: "보통",
  important: "중요",
  critical: "매우 중요",
};
