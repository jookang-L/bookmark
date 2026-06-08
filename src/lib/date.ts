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

/** ISO → <input type="datetime-local"> 값 */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → ISO (로컬 시각) */
export function fromDateTimeLocalValue(v: string): string {
  const [datePart, timePart = "09:00"] = v.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** 알림 시각 표시: "6월 5일 14:30" */
export function formatRemindAt(iso: string): string {
  return format(new Date(iso), "M월 d일 HH:mm", { locale: ko });
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function setLocalTime(d: Date, hours: number, minutes = 0): Date {
  const next = new Date(d);
  next.setHours(hours, minutes, 0, 0);
  return next;
}
