import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

// 창 간 데이터 동기화용 전역 이벤트.
const NOTES_CHANGED = "notes:changed";

interface ChangedPayload {
  src: string;
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
