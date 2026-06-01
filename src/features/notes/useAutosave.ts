import { useCallback, useRef, useState } from "react";
import type { Note } from "@/types/note";
import { saveNote } from "@/lib/db";
import { emitNotesChanged } from "@/lib/events";
import { AUTOSAVE_DEBOUNCE_MS } from "@/constants/design";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// 디바운스 자동저장 + 즉시 flush. 메인/고정 창에서 공통으로 쓴다.
export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef<Note | null>(null);

  const flush = useCallback(async () => {
    const n = dirty.current;
    if (!n) return;
    dirty.current = null;
    window.clearTimeout(timer.current);
    try {
      await saveNote(n);
      setStatus("saved");
      setError("");
      emitNotesChanged();
    } catch (e) {
      console.error("저장 실패", e);
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
      dirty.current = n;
    }
  }, []);

  const schedule = useCallback(
    (n: Note) => {
      dirty.current = n;
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  const saveNow = useCallback(async (n: Note) => {
    setStatus("saving");
    try {
      await saveNote(n);
      setStatus("saved");
      setError("");
      emitNotesChanged();
    } catch (e) {
      console.error("저장 실패", e);
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const cancel = useCallback(() => {
    dirty.current = null;
    window.clearTimeout(timer.current);
  }, []);

  return { status, error, schedule, flush, saveNow, cancel };
}
