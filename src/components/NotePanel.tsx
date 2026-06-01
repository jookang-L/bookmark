import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  X,
  Pin,
  PinOff,
  Bookmark,
  BookmarkX,
  CalendarDays,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import type { Importance, Note } from "@/types/note";
import { IMPORTANCE_LABEL } from "@/types/note";
import {
  formatNoteDate,
  toDateInputValue,
  fromDateInputValue,
} from "@/lib/date";
import { tintWithWhite } from "@/lib/color";
import { RichEditor } from "./RichEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { ColorPicker } from "./ColorPicker";
import type { SaveStatus } from "@/features/notes/useAutosave";

export type { SaveStatus };

interface NotePanelProps {
  note: Note;
  saveStatus: SaveStatus;
  saveError?: string;
  onChange: (patch: Partial<Note>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
}

const IMPORTANCE_OPTIONS: Importance[] = [
  "low",
  "normal",
  "important",
  "critical",
];

export function NotePanel({
  note,
  saveStatus,
  saveError,
  onChange,
  onClose,
  onDelete,
  onBack,
}: NotePanelProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 새 메모(제목 빈 값)면 제목에 포커스
  useEffect(() => {
    if (!note.title) titleRef.current?.focus();
  }, [note.id, note.title]);

  const tint = tintWithWhite(note.color, 0.16);

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl"
      style={{ backgroundColor: tint }}
    >
      <div className="flex items-center gap-1 border-b border-black/5 bg-white/70 px-2 py-2 backdrop-blur">
        {onBack && (
          <IconBtn title="목록으로" onClick={onBack}>
            <ArrowLeft size={18} />
          </IconBtn>
        )}
        <input
          ref={titleRef}
          value={note.title}
          placeholder="제목 없음"
          onChange={(e) => onChange({ title: e.target.value })}
          className="min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />
        <IconBtn
          title={note.showAsBookmark ? "책갈피 표시 끄기" : "책갈피에 표시"}
          active={note.showAsBookmark}
          onClick={() => onChange({ showAsBookmark: !note.showAsBookmark })}
        >
          {note.showAsBookmark ? (
            <Bookmark size={18} />
          ) : (
            <BookmarkX size={18} />
          )}
        </IconBtn>
        <IconBtn
          title={note.isPanelPinned ? "고정 해제" : "패널 고정"}
          active={note.isPanelPinned}
          onClick={() => onChange({ isPanelPinned: !note.isPanelPinned })}
        >
          {note.isPanelPinned ? <Pin size={18} /> : <PinOff size={18} />}
        </IconBtn>
        <IconBtn
          title={note.isArchived ? "보관 해제" : "보관함으로"}
          active={note.isArchived}
          onClick={() => onChange({ isArchived: !note.isArchived })}
        >
          {note.isArchived ? (
            <ArchiveRestore size={18} />
          ) : (
            <Archive size={18} />
          )}
        </IconBtn>
        <IconBtn title="휴지통으로 이동" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={18} />
        </IconBtn>
        <IconBtn title="패널 접기" onClick={onClose}>
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
                onChange({ noteDate: fromDateInputValue(e.target.value) });
            }}
            className="absolute bottom-0 left-6 h-0 w-0 opacity-0"
            tabIndex={-1}
          />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <ColorPicker
            value={note.color}
            onChange={(color) => onChange({ color })}
          />
          <select
            value={note.importance}
            onChange={(e) =>
              onChange({ importance: e.target.value as Importance })
            }
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

      <RichEditor
        noteId={note.id}
        initialContent={note.content}
        onChange={(content, contentText) => onChange({ content, contentText })}
      />

      <div className="border-t border-black/5 bg-white/60 px-3 py-1.5 text-right text-xs">
        <SaveIndicator status={saveStatus} error={saveError} />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message="이 메모를 휴지통으로 옮길까요?"
          detail="휴지통에서 복구할 수 있으며, 30일 후 자동 삭제됩니다."
          confirmLabel="휴지통으로"
          danger
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete(note.id);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function SaveIndicator({
  status,
  error,
}: {
  status: SaveStatus;
  error?: string;
}) {
  if (status === "saving")
    return <span className="text-slate-400">저장 중...</span>;
  if (status === "saved") return <span className="text-slate-400">저장됨</span>;
  if (status === "error")
    return (
      <span
        className="font-medium text-rose-500"
        title={error || undefined}
      >
        저장 실패{error ? `: ${error}` : ""}
      </span>
    );
  return null;
}

function IconBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md p-1.5 transition-colors",
        active
          ? "bg-slate-800 text-white"
          : "text-slate-500 hover:bg-black/5 hover:text-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
