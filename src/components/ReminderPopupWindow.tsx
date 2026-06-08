import { useCallback, useEffect, useState } from "react";
import { X, ExternalLink, Clock } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Importance, Note } from "@/types/note";
import { IMPORTANCE_LABEL } from "@/types/note";
import { getNote, saveNote } from "@/lib/db";
import {
  emitNotesChanged,
  emitReminderOpenNote,
  onNotesChanged,
} from "@/lib/events";
import { notePreviewText } from "@/lib/noteText";
import { todayIso } from "@/lib/date";
import { snoozeMinutes, snoozeTomorrowMorning } from "@/lib/reminder";

const IMPORTANCE_RING: Record<Importance, string> = {
  low: "ring-slate-300",
  normal: "ring-slate-400",
  important: "ring-amber-400",
  critical: "ring-rose-500",
};

interface ReminderPopupWindowProps {
  noteId: string;
}

export function ReminderPopupWindow({ noteId }: ReminderPopupWindowProps) {
  const [note, setNote] = useState<Note | null>(null);

  const reload = useCallback(async () => {
    const n = await getNote(noteId);
    if (!n || !n.remindAt) {
      await getCurrentWindow().close();
      return;
    }
    setNote(n);
  }, [noteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => onNotesChanged(() => void reload()), [reload]);

  const dismiss = useCallback(async () => {
    const n = await getNote(noteId);
    if (n) {
      await saveNote({ ...n, remindAt: null, updatedAt: todayIso() });
      emitNotesChanged();
    }
    await getCurrentWindow().close();
  }, [noteId]);

  const snooze = useCallback(
    async (iso: string) => {
      const n = await getNote(noteId);
      if (n) {
        await saveNote({ ...n, remindAt: iso, updatedAt: todayIso() });
        emitNotesChanged();
      }
      await getCurrentWindow().close();
    },
    [noteId],
  );

  const openNote = useCallback(async () => {
    const n = await getNote(noteId);
    if (n) {
      await saveNote({ ...n, remindAt: null, updatedAt: todayIso() });
      emitNotesChanged();
    }
    emitReminderOpenNote(noteId);
    await getCurrentWindow().close();
  }, [noteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  if (!note) return null;

  const preview = notePreviewText(note.contentText, 200);
  const ring = IMPORTANCE_RING[note.importance];

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black/25 p-4">
      <div
        className={[
          "relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ring-2",
          ring,
        ].join(" ")}
        style={{ borderTopColor: note.color, borderTopWidth: 4 }}
      >
        <button
          type="button"
          title="닫기"
          onClick={() => void dismiss()}
          className="absolute top-3 right-3 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <p className="pr-8 text-xs font-medium tracking-wide text-slate-400 uppercase">
          메모 알림 · {IMPORTANCE_LABEL[note.importance]}
        </p>
        <h2 className="mt-1 pr-6 text-xl font-bold text-slate-900">
          {note.title || "제목 없음"}
        </h2>
        {preview && (
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">
            {preview}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void openNote()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            <ExternalLink size={16} />
            메모 열기
          </button>
          <SnoozeBtn
            label="5분 후"
            onClick={() => void snooze(snoozeMinutes(5))}
          />
          <SnoozeBtn
            label="1시간 후"
            onClick={() => void snooze(snoozeMinutes(60))}
          />
          <SnoozeBtn
            label="내일 9시"
            onClick={() => void snooze(snoozeTomorrowMorning())}
          />
        </div>
      </div>
    </div>
  );
}

function SnoozeBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      <Clock size={14} />
      {label}
    </button>
  );
}
