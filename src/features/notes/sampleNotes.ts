import type { Note } from "@/types/note";
import { PASTEL_PALETTE } from "@/constants/design";
import { docFromText } from "@/lib/tiptapContent";
import { countNotes, saveNote } from "@/lib/db";

// 빈 DB 첫 실행 시 넣어줄 예시 메모.
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeSeed(
  id: string,
  title: string,
  text: string,
  noteDate: string,
  importance: Note["importance"],
  showAsBookmark: boolean,
  bookmarkOrder: number | null,
  color: string,
): Note {
  const now = new Date().toISOString();
  return {
    id,
    title,
    content: docFromText(text),
    contentText: text,
    noteDate,
    createdAt: now,
    updatedAt: now,
    importance,
    showAsBookmark,
    bookmarkOrder,
    color,
    opacity: 1,
    panelWidth: 420,
    isPanelPinned: false,
    isArchived: false,
    deletedAt: null,
    remindAt: null,
  };
}

export const SEED_NOTES: Note[] = [
  makeSeed(
    "n1",
    "수행평가 확인",
    "점수 입력 후 학생 확인\n1반 점수 입력\n2반 점수 입력",
    daysFromNow(4),
    "important",
    true,
    0,
    PASTEL_PALETTE.pink,
  ),
  makeSeed(
    "n2",
    "학부모 상담 연락",
    "상담 시간 안내하기. 가능 시간대 정리 후 문자 발송.",
    daysFromNow(6),
    "normal",
    true,
    1,
    PASTEL_PALETTE.sky,
  ),
  makeSeed(
    "n3",
    "도서관 책 반납",
    "기한 지남! 오늘 중으로 반납하기.",
    daysFromNow(-2),
    "critical",
    true,
    2,
    PASTEL_PALETTE.orange,
  ),
  makeSeed(
    "n4",
    "장보기 목록",
    "우유, 달걀, 빵, 커피",
    daysFromNow(0),
    "low",
    false,
    null,
    PASTEL_PALETTE.green,
  ),
];

/** DB가 비어 있을 때만 예시 메모를 넣는다. */
export async function seedIfEmpty(): Promise<void> {
  const n = await countNotes();
  if (n > 0) return;
  for (const note of SEED_NOTES) {
    await saveNote(note);
  }
}
