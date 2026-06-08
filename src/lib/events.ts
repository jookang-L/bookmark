import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

// 창 간 데이터 동기화용 전역 이벤트.
const NOTES_CHANGED = "notes:changed";
const REMINDER_OPEN_NOTE = "reminder:open-note";

interface ChangedPayload {
  src: string;
}

interface OpenNotePayload {
  noteId: string;
}

/** 어떤 창에서 메모 데이터를 바꿨을 때 다른 창들에 알린다. */
export function emitNotesChanged(): void {
  void emit(NOTES_CHANGED, { src: getCurrentWindow().label });
}

/** 다른 창에서 변경이 발생하면 콜백 실행(자기 자신이 보낸 건 무시). */
export function onNotesChanged(cb: () => void): () => void {
  const me = getCurrentWindow().label;
  let un: UnlistenFn | undefined;
  void listen<ChangedPayload>(NOTES_CHANGED, (e) => {
    if (e.payload?.src === me) return;
    cb();
  }).then((f) => {
    un = f;
  });
  return () => un?.();
}

/** 알림 팝업에서 메모 열기 요청 */
export function emitReminderOpenNote(noteId: string): void {
  void emit(REMINDER_OPEN_NOTE, { noteId });
}

export function onReminderOpenNote(cb: (noteId: string) => void): () => void {
  let un: UnlistenFn | undefined;
  void listen<OpenNotePayload>(REMINDER_OPEN_NOTE, (e) => {
    if (e.payload?.noteId) cb(e.payload.noteId);
  }).then((f) => {
    un = f;
  });
  return () => un?.();
}
