import { useRef, useState } from "react";
import { RibbonBookmark } from "./RibbonBookmark";
import type { Note } from "@/types/note";
import { BOOKMARK_SIZES, type BookmarkSize } from "@/constants/design";
import { notePreviewText } from "@/lib/noteText";

interface EdgeRibbonsProps {
  bookmarkNotes: Note[];
  selectedNoteId: string | null;
  listOpen: boolean;
  size?: BookmarkSize;
  onPrimaryClick: () => void;
  onItemClick: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

// 대표 책갈피(전체 목록) → 그 아래 개별 책갈피. 묶음 전체를 화면 세로 중앙에 배치.
export function EdgeRibbons({
  bookmarkNotes,
  selectedNoteId,
  listOpen,
  size = "normal",
  onPrimaryClick,
  onItemClick,
  onReorder,
}: EdgeRibbonsProps) {
  const dim = BOOKMARK_SIZES[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startY: number; moved: boolean } | null>(
    null,
  );
  const overIndexRef = useRef<number | null>(null);
  const justDragged = useRef(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function computeOverIndex(clientY: number): number {
    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        "[data-ribbon-item]",
      ) ?? [],
    );
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return items.length;
  }

  function onMove(e: PointerEvent) {
    const st = drag.current;
    if (!st) return;
    if (!st.moved) {
      if (Math.abs(e.clientY - st.startY) < 5) return;
      st.moved = true;
      setDragId(st.id);
    }
    const idx = computeOverIndex(e.clientY);
    overIndexRef.current = idx;
    setOverIndex(idx);
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const st = drag.current;
    drag.current = null;
    if (st?.moved) {
      const ids = bookmarkNotes.map((n) => n.id);
      const from = ids.indexOf(st.id);
      let to = overIndexRef.current ?? ids.length;
      if (from !== -1) {
        ids.splice(from, 1);
        if (to > from) to -= 1;
        to = Math.max(0, Math.min(ids.length, to));
        ids.splice(to, 0, st.id);
        onReorder(ids);
      }
      justDragged.current = true;
      window.setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }
    setDragId(null);
    setOverIndex(null);
    overIndexRef.current = null;
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    drag.current = { id, startY: e.clientY, moved: false };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleClick(id: string) {
    if (justDragged.current) return;
    onItemClick(id);
  }

  const lastIndex = bookmarkNotes.length;

  return (
    <div className="flex h-full flex-col items-end justify-center overflow-hidden py-2 pr-0">
      <div className="flex max-h-full flex-col items-end gap-1 overflow-y-auto">
        <RibbonBookmark
          kind="primary"
          title="Bookmark · 전체 메모 목록"
          width={dim.width}
          height={dim.primaryHeight}
          selected={listOpen}
          onClick={onPrimaryClick}
        />

        <div ref={containerRef} className="flex flex-col items-end gap-1">
          {bookmarkNotes.map((note, i) => {
            const showLineBefore =
              dragId !== null && overIndex === i && dragId !== note.id;
            const showLineEnd =
              dragId !== null && overIndex === lastIndex && i === lastIndex - 1;
            return (
              <div
                key={note.id}
                data-ribbon-item
                onPointerDown={(e) => onPointerDown(e, note.id)}
                className={[
                  "relative shrink-0 touch-none transition-opacity",
                  dragId === note.id ? "opacity-40" : "",
                  showLineBefore
                    ? "before:absolute before:-top-1 before:right-0 before:h-0.5 before:w-6 before:rounded before:bg-slate-500 before:content-['']"
                    : "",
                  showLineEnd
                    ? "after:absolute after:-bottom-1 after:right-0 after:h-0.5 after:w-6 after:rounded after:bg-slate-500 after:content-['']"
                    : "",
                ].join(" ")}
              >
                <RibbonBookmark
                  kind="item"
                  color={note.color}
                  title={note.title}
                  preview={notePreviewText(note.contentText)}
                  hasReminder={!!note.remindAt}
                  importance={note.importance}
                  width={dim.width}
                  height={dim.itemHeight}
                  selected={selectedNoteId === note.id}
                  onClick={() => handleClick(note.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
