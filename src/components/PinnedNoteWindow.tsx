import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  PinOff,
  X,
  CalendarDays,
  Trash2,
  GripVertical,
} from "lucide-react";
import type { Importance, Note } from "@/types/note";
import { IMPORTANCE_LABEL } from "@/types/note";
import {
  formatNoteDate,
  toDateInputValue,
  fromDateInputValue,
  todayIso,
} from "@/lib/date";
import { tintWithWhite } from "@/lib/color";
import { refreshWindowPaint } from "@/lib/window";
import { getNote, hardDeleteNote, setWinGeo } from "@/lib/db";
import { emitNotesChanged, onNotesChanged } from "@/lib/events";
import { useAutosave } from "@/features/notes/useAutosave";
import { RichEditor } from "./RichEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { ColorPicker } from "./ColorPicker";
import { ReminderEditor } from "./ReminderEditor";

const IMPORTANCE_OPTIONS: Importance[] = [
  "low",
  "normal",
  "important",
  "critical",
];

export function PinnedNoteWindow({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<Note | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const { status, error, schedule, flush, saveNow } = useAutosave();

  // 최초 로드
  useEffect(() => {
    let alive = true;
    void getNote(noteId).then((n) => {
      if (!alive) return;
      if (!n || n.deletedAt) {
        void getCurrentWindow().close();
        return;
      }
      setNote(n);
      void getCurrentWindow().setTitle(n.title || "메모");
    });
    return () => {
      alive = false;
    };
  }, [noteId]);

  // 메모 로드 후 한 번 더 repaint (투명 창 첫 표시 보정)
  useEffect(() => {
    if (!note) return;
    void refreshWindowPaint();
  }, [note]);

  // 다른 창의 변경 반영 (삭제/보관/해제되면 창 닫기)
  useEffect(() => {
    return onNotesChanged(() => {
      void getNote(noteId).then((n) => {
        if (!n || n.deletedAt || n.isArchived || !n.isPanelPinned) {
          void getCurrentWindow().close();
          return;
        }
        setNote((prev) => (prev ? { ...n } : n));
      });
    });
  }, [noteId]);

  // 창 이동/크기 변경 시 위치·크기 저장(디바운스)
  useEffect(() => {
    const w = getCurrentWindow();
    let t: number | undefined;
    const save = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        void (async () => {
          const pos = await w.outerPosition();
          const size = await w.innerSize();
          void setWinGeo(noteId, {
            x: pos.x,
            y: pos.y,
            w: size.width,
            h: size.height,
          });
        })();
      }, 400);
    };
    const uns: UnlistenFn[] = [];
    void w.onMoved(save).then((f) => uns.push(f));
    void w.onResized(save).then((f) => uns.push(f));
    return () => {
      window.clearTimeout(t);
      uns.forEach((f) => f());
    };
  }, [noteId]);

  // 포커스 잃을 때 즉시 저장
  useEffect(() => {
    const onBlur = () => void flush();
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [flush]);

  const patch = useCallback(
    (p: Partial<Note>) => {
      setNote((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...p, updatedAt: todayIso() };
        if (next.isArchived) next.remindAt = null;
        schedule(next);
        if (p.title !== undefined)
          void getCurrentWindow().setTitle(next.title || "메모");
        return next;
      });
    },
    [schedule],
  );

  const unpinAndClose = useCallback(async () => {
    if (note) {
      await flush();
      await saveNow({ ...note, isPanelPinned: false, updatedAt: todayIso() });
    }
    await getCurrentWindow().close();
  }, [note, flush, saveNow]);

  const doDelete = useCallback(async () => {
    await hardDeleteNote(noteId);
    emitNotesChanged();
    await getCurrentWindow().close();
  }, [noteId]);

  if (!note) return null;

  const tint = tintWithWhite(note.color, 0.16);

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl"
      style={{ backgroundColor: tint }}
    >
      <div className="flex items-center gap-1 border-b border-black/5 bg-white/70 px-2 py-2 backdrop-blur">
        <div
          data-tauri-drag-region
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          <GripVertical
            size={16}
            className="pointer-events-none shrink-0 text-slate-400"
          />
          <input
            value={note.title}
            placeholder="제목 없음"
            onChange={(e) => patch({ title: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <IconBtn
          title="고정 해제(창 닫기)"
          onClick={() => void unpinAndClose()}
        >
          <PinOff size={18} />
        </IconBtn>
        <IconBtn title="삭제" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={18} />
        </IconBtn>
        <IconBtn title="닫기(고정 해제)" onClick={() => void unpinAndClose()}>
          <X size={18} />
        </IconBtn>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 text-sm text-slate-600">
        <button
          type="button"
          onClick={() => {
            const el = dateRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.focus();
          }}
          className="relative flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-black/5"
          title="메모 날짜 변경"
        >
          <CalendarDays size={15} />
          <span>메모 날짜: {formatNoteDate(note.noteDate)}</span>
          <input
            ref={dateRef}
            type="date"
            value={toDateInputValue(note.noteDate)}
            onChange={(e) => {
              if (e.target.value)
                patch({ noteDate: fromDateInputValue(e.target.value) });
            }}
            className="absolute bottom-0 left-6 h-0 w-0 opacity-0"
            tabIndex={-1}
          />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <ColorPicker
            value={note.color}
            onChange={(color) => patch({ color })}
          />
          <select
            value={note.importance}
            onChange={(e) => patch({ importance: e.target.value as Importance })}
            className="rounded-md border border-slate-200 bg-white/80 px-2 py-1 text-xs text-slate-700 outline-none"
          >
            {IMPORTANCE_OPTIONS.map((imp) => (
              <option key={imp} value={imp}>
                {IMPORTANCE_LABEL[imp]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReminderEditor
        remindAt={note.remindAt}
        noteDate={note.noteDate}
        onChange={(remindAt) => patch({ remindAt })}
      />

      <RichEditor
        noteId={note.id}
        initialContent={note.content}
        onChange={(content, contentText) => patch({ content, contentText })}
      />

      <div className="border-t border-black/5 bg-white/60 px-3 py-1.5 text-right text-xs">
        {status === "saving" && <span className="text-slate-400">저장 중...</span>}
        {status === "saved" && <span className="text-slate-400">저장됨</span>}
        {status === "error" && (
          <span className="font-medium text-rose-500" title={error}>
            저장 실패{error ? `: ${error}` : ""}
          </span>
        )}
      </div>

      <ResizeGrip />

      {confirmDelete && (
        <ConfirmDialog
          message="이 메모를 삭제할까요?"
          detail="삭제하면 되돌릴 수 없습니다."
          confirmLabel="삭제"
          danger
          onConfirm={() => {
            setConfirmDelete(false);
            void doDelete();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function ResizeGrip() {
  return (
    <div
      onMouseDown={() => {
        void getCurrentWindow().startResizeDragging("SouthEast");
      }}
      title="크기 조절"
      className="absolute right-0 bottom-0 z-20 h-4 w-4 cursor-nwse-resize"
      style={{
        background:
          "linear-gradient(135deg, transparent 50%, rgba(100,116,139,0.5) 50%)",
      }}
    />
  );
}

function IconBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700"
    >
      {children}
    </button>
  );
}
