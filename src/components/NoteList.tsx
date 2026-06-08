import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Bookmark,
  X,
  Settings2,
  Trash2,
  Bell,
} from "lucide-react";
import { isToday, isThisWeek, isThisMonth } from "date-fns";
import type { Importance, Note } from "@/types/note";
import { IMPORTANCE_LABEL } from "@/types/note";
import { formatShortDate, formatRemindAt, isOverdue } from "@/lib/date";
import { APP_NAME } from "@/constants/design";
import { SettingsPopover } from "./SettingsPopover";
import { ConfirmDialog } from "./ConfirmDialog";
import { ContextMenu } from "./ContextMenu";
import type { BookmarkBackup } from "@/types/backup";
import type { AppSettings } from "@/features/settings/useAppSettings";

interface NoteListProps {
  notes: Note[];
  settings: AppSettings;
  autostart: boolean;
  onChangeSettings: (patch: Partial<AppSettings>) => void;
  onToggleAutostart: (on: boolean) => void;
  onOpenNote: (id: string) => void;
  onNewNote: () => void;
  onRestoreBackup: (backup: BookmarkBackup) => Promise<void>;
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}

type SortKey = "dateAsc" | "dateDesc" | "importance" | "updated" | "title";
type FilterKey =
  | "all"
  | "today"
  | "week"
  | "month"
  | "important"
  | "bookmarked"
  | "archived";

const SORT_LABEL: Record<SortKey, string> = {
  dateAsc: "메모 날짜 가까운 순",
  dateDesc: "메모 날짜 먼 순",
  importance: "중요도 높은 순",
  updated: "최근 수정 순",
  title: "제목 순",
};

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "전체 메모",
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
  important: "중요 메모",
  bookmarked: "책갈피에 표시",
  archived: "보관된 메모",
};

const IMPORTANCE_RANK: Record<Importance, number> = {
  critical: 3,
  important: 2,
  normal: 1,
  low: 0,
};

export function NoteList({
  notes,
  settings,
  autostart,
  onChangeSettings,
  onToggleAutostart,
  onOpenNote,
  onNewNote,
  onRestoreBackup,
  onDelete,
  onClose,
}: NoteListProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("dateAsc");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);

  useEffect(() => {
    setSelectedIds(new Set());
    setContextMenu(null);
  }, [filter, query]);

  const requestDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmDeleteIds(ids);
  }, []);

  const handleRowClick = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(noteId)) next.delete(noteId);
          else next.add(noteId);
          return next;
        });
      } else {
        setSelectedIds(new Set([noteId]));
      }
    },
    [],
  );

  const handleRowDoubleClick = useCallback(
    (noteId: string) => {
      onOpenNote(noteId);
    },
    [onOpenNote],
  );

  const handleRowContextMenu = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.preventDefault();
      setSelectedIds((prev) => {
        if (prev.has(noteId)) return prev;
        return new Set([noteId]);
      });
      setContextMenu({ x: e.clientX, y: e.clientY, noteId });
    },
    [],
  );

  useEffect(() => {
    if (selectedIds.size === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      requestDelete([...selectedIds]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, requestDelete]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows: Note[];

    if (filter === "archived") {
      rows = notes.filter((n) => n.isArchived);
    } else {
      rows = notes.filter((n) => !n.isArchived);
      rows = rows.filter((n) => {
        const d = new Date(n.noteDate);
        switch (filter) {
          case "today":
            return isToday(d);
          case "week":
            return isThisWeek(d, { weekStartsOn: 1 });
          case "month":
            return isThisMonth(d);
          case "important":
            return n.importance === "important" || n.importance === "critical";
          case "bookmarked":
            return n.showAsBookmark;
          default:
            return true;
        }
      });
    }

    if (q) {
      rows = rows.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.contentText.toLowerCase().includes(q),
      );
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "dateAsc":
          return +new Date(a.noteDate) - +new Date(b.noteDate);
        case "dateDesc":
          return +new Date(b.noteDate) - +new Date(a.noteDate);
        case "importance":
          return IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance];
        case "updated":
          return +new Date(b.updatedAt) - +new Date(a.updatedAt);
        case "title":
          return a.title.localeCompare(b.title, "ko");
        default:
          return 0;
      }
    });
    return sorted;
  }, [notes, query, sort, filter]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-800">
          {APP_NAME}
        </h1>
        <div className="relative z-10 flex items-center gap-0.5">
          {selectedIds.size > 0 && (
            <button
              type="button"
              title="삭제"
              onClick={() => requestDelete([...selectedIds])}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            title="새 메모"
            onClick={onNewNote}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            title="투명도 설정"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <Settings2 size={18} />
          </button>
          <button
            type="button"
            title="목록 접기"
            onClick={onClose}
            className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsPopover
          settings={settings}
          autostart={autostart}
          onChange={onChangeSettings}
          onToggleAutostart={onToggleAutostart}
          onRestore={onRestoreBackup}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <Search size={15} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모 검색"
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex gap-2 px-4 py-2.5 text-xs">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 outline-none"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              정렬: {SORT_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKey)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 outline-none"
        >
          {(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => (
            <option key={k} value={k}>
              {FILTER_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-400">
            표시할 메모가 없습니다.
          </p>
        ) : (
          visible.map((note) => {
            const selected = selectedIds.has(note.id);
            return (
            <div
              key={note.id}
              className={[
                "group flex items-center gap-1 rounded-lg pr-1",
                selected ? "bg-sky-50 ring-1 ring-sky-200" : "hover:bg-slate-50",
              ].join(" ")}
              onClick={(e) => handleRowClick(note.id, e)}
              onDoubleClick={() => handleRowDoubleClick(note.id)}
              onContextMenu={(e) => handleRowContextMenu(note.id, e)}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left cursor-default">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: note.color }}
                  />
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {note.title || "제목 없음"}
                  </span>
                  {note.showAsBookmark && (
                    <Bookmark size={13} className="shrink-0 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 pl-[18px] text-xs">
                  <span
                    className={
                      isOverdue(note.noteDate)
                        ? "font-semibold text-rose-500"
                        : "text-slate-500"
                    }
                  >
                    {formatShortDate(note.noteDate)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">
                    {IMPORTANCE_LABEL[note.importance]}
                  </span>
                  {note.remindAt && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span
                        className="inline-flex items-center gap-0.5 text-amber-600"
                        title={`알림 ${formatRemindAt(note.remindAt)}`}
                      >
                        <Bell size={11} />
                        {formatRemindAt(note.remindAt)}
                      </span>
                    </>
                  )}
                </div>
                <p className="truncate pl-[18px] text-xs text-slate-400">
                  {note.contentText.replace(/\n/g, " ") || "내용 없음"}
                </p>
              </div>

            </div>
            );
          })
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: "삭제",
              danger: true,
              onClick: () => {
                const ids = selectedIds.has(contextMenu.noteId)
                  ? [...selectedIds]
                  : [contextMenu.noteId];
                requestDelete(ids);
              },
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {confirmDeleteIds && (
        <ConfirmDialog
          message={
            confirmDeleteIds.length > 1
              ? `${confirmDeleteIds.length}개 메모를 삭제할까요?`
              : "이 메모를 삭제할까요?"
          }
          detail="삭제하면 되돌릴 수 없습니다."
          confirmLabel="삭제"
          danger
          onConfirm={() => {
            onDelete(confirmDeleteIds);
            setSelectedIds(new Set());
            setConfirmDeleteIds(null);
          }}
          onCancel={() => setConfirmDeleteIds(null)}
        />
      )}

    </div>
  );
}
