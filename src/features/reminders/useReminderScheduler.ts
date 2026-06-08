import { useEffect, useRef } from "react";
import type { Note } from "@/types/note";
import { isReminderDue, isReminderEligible } from "@/lib/reminder";
import {
  isReminderWindowOpen,
  openReminderWindow,
} from "@/windows/reminder";

const POLL_MS = 20_000;

/** 앱 실행 중 예약 알림을 감시하고 팝업을 띄운다. */
export function useReminderScheduler(notes: Note[], enabled: boolean) {
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const now = Date.now();
        const due = notesRef.current.filter(
          (n) => isReminderEligible(n) && isReminderDue(n.remindAt!, now),
        );
        let stack = 0;
        for (const note of due) {
          if (await isReminderWindowOpen(note.id)) continue;
          await openReminderWindow(note.id, stack);
          stack += 1;
        }
      } finally {
        checkingRef.current = false;
      }
    };

    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
