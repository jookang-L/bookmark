import { format, isBefore, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

/** "2026년 6월 1일 월요일" 형태 */
export function formatNoteDate(iso: string): string {
  return format(new Date(iso), "yyyy년 M월 d일 EEEE", { locale: ko });
}

/** 목록용 짧은 날짜: "6월 5일" */
export function formatShortDate(iso: string): string {
  return format(new Date(iso), "M월 d일", { locale: ko });
}

/** 본문 삽입용: "2026-06-01 (월)" */
export function todayInsertText(): string {
  return format(new Date(), "yyyy-MM-dd (EEEEE)", { locale: ko });
}

/** 오늘보다 이전 날짜인지(지난 메모 강조용) */
export function isOverdue(iso: string): boolean {
  return isBefore(startOfDay(new Date(iso)), startOfDay(new Date()));
}

export function todayIso(): string {
  return new Date().toISOString();
}

/** ISO → <input type="date"> 값 "yyyy-MM-dd" */
export function toDateInputValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

/** "yyyy-MM-dd" → ISO. 타임존 밀림 방지를 위해 로컬 정오로 고정 */
export function fromDateInputValue(v: string): string {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
