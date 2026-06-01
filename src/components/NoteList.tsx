import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Bookmark,
  X,
  Settings2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { isToday, isThisWeek, isThisMonth } from "date-fns";
import type { Importance, Note } from "@/types/note";
import { IMPORTANCE_LABEL } from "@/types/note";
import { formatShortDate, isOverdue } from "@/lib/date";
import { APP_NAME } from "@/constants/design";
import { SettingsPopover } from "./SettingsPopover";
import { ConfirmDialog } from "./ConfirmDialog";
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
  onRestore: (id: string) => void;
  onRestoreBackup: (backup: BookmarkBackup) => Promise<void>;
  onPermanentDelete: (id: string) => void;
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
  | "archived"
  | "trash";

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
  trash: "휴지통",
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
  onRestore,
  onRestoreBackup,
  onPermanentDelete,
  onClose,
}: NoteListProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("dateAsc");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  const isTrash = filter === "trash";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows: Note[];

    if (filter === "trash") {
      rows = notes.filter((n) => n.deletedAt);
    } else if (filter === "archived") {
      rows = notes.filter((n) => n.isArchived && !n.deletedAt);
    } else {
      rows = notes.filter((n) => !n.isArchived && !n.deletedAt);
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="새 메모"
            onClick={onNewNote}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            title="투명도 설정"
            onClick={() => setSettingsOpen((v) => !v)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Settings2 size={18} />
          </button>
          <button
            type="button"
            title="목록 접기"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
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
            {isTrash ? "휴지통이 비어 있습니다." : "표시할 메모가 없습니다."}
          </p>
        ) : (
          visible.map((note) => (
            <div
              key={note.id}
              className="group flex items-center gap-1 rounded-lg pr-1 hover:bg-slate-50"
            >
              <button
                type="button"
                onClick={() => !isTrash && onOpenNote(note.id)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5 text-left"
              >
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
                      !isTrash && isOverdue(note.noteDate)
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
                </div>
                <p className="truncate pl-[18px] text-xs text-slate-400">
                  {note.contentText.replace(/\n/g, " ") || "내용 없음"}
                </p>
              </button>

              {isTrash && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    title="복구"
                    onClick={() => onRestore(note.id)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    title="영구 삭제"
                    onClick={() => setPurgeId(note.id)}
                    className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {purgeId && (
        <ConfirmDialog
          message="이 메모를 영구 삭제할까요?"
          detail="영구 삭제하면 되돌릴 수 없습니다."
          confirmLabel="영구 삭제"
          danger
          onConfirm={() => {
            onPermanentDelete(purgeId);
            setPurgeId(null);
          }}
          onCancel={() => setPurgeId(null)}
        />
      )}
    </div>
  );
}
