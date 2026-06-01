import { useCallback, useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { EdgeRibbons } from "@/components/EdgeRibbons";
import { NotePanel } from "@/components/NotePanel";
import { NoteList } from "@/components/NoteList";
import { GuideOverlay } from "@/components/GuideOverlay";
import type { Note } from "@/types/note";
import { seedIfEmpty } from "@/features/notes/sampleNotes";
import { useAppSettings } from "@/features/settings/useAppSettings";
import { useAutosave } from "@/features/notes/useAutosave";
import {
  toggleMainWindow,
  setGlobalShortcut,
  getAutostart,
  setAutostart,
} from "@/lib/system";
import {
  listAllNotes,
  softDeleteNote,
  restoreNote,
  hardDeleteNote,
  purgeExpiredTrash,
  setBookmarkOrders,
  restoreFromBackup,
} from "@/lib/db";
import type { BookmarkBackup } from "@/types/backup";
import { emitNotesChanged, onNotesChanged } from "@/lib/events";
import {
  openPinnedWindow,
  closePinnedWindow,
  closeAllPinnedWindows,
  reopenPinnedWindows,
} from "@/windows/pinned";
import { showPlaced, placeAtRightEdge, edgeWindowHeight } from "@/lib/window";
import { todayIso } from "@/lib/date";
import { EMPTY_DOC } from "@/lib/tiptapContent";
import {
  RIBBON_COLUMN_WIDTH,
  PANEL_DEFAULT_WIDTH,
  PANEL_MIN_WIDTH,
  PANEL_MAX_WIDTH,
  PANEL_MOTION_MS,
  PASTEL_PALETTE,
  DEFAULT_BOOKMARK_OPACITY,
  DEFAULT_PANEL_OPACITY,
  DEFAULT_HOTKEY,
} from "@/constants/design";

type Mode = "collapsed" | "list" | "note";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [mode, setMode] = useState<Mode>("collapsed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [autostart, setAutostartState] = useState(false);
  const fromList = useRef(false);
  const { settings, loaded: settingsLoaded, update: updateSettings } =
    useAppSettings();
  const {
    status: saveStatus,
    error: saveError,
    schedule: scheduleSave,
    flush,
    saveNow,
    cancel: cancelSave,
  } = useAutosave();

  const reload = useCallback(async () => {
    try {
      setNotes(await listAllNotes());
    } catch (e) {
      console.error("목록 새로고침 실패", e);
    }
  }, []);

  // 시작: 휴지통 정리 → 시드 → 목록 로드 → 고정 창 복원 → 창 표시
  useEffect(() => {
    (async () => {
      try {
        await purgeExpiredTrash();
        await seedIfEmpty();
        const all = await listAllNotes();
        setNotes(all);
        await reopenPinnedWindows(all);
      } catch (e) {
        console.error("초기화 실패", e);
      }
      const h = await edgeWindowHeight();
      await showPlaced({
        width: RIBBON_COLUMN_WIDTH,
        height: h,
      });
    })();
  }, []);

  // 다른 창(고정 메모)에서 바뀌면 목록 새로고침
  useEffect(() => onNotesChanged(() => void reload()), [reload]);

  // 포커스 잃을 때 / 종료 직전 즉시 저장
  useEffect(() => {
    const onBlur = () => void flush();
    const onBeforeUnload = () => void flush();
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush]);

  // 자동 시작 현재 상태 로드
  useEffect(() => {
    void getAutostart().then(setAutostartState);
  }, []);

  // 전역 단축키 등록(설정 변경 시 갱신)
  useEffect(() => {
    if (!settings.hotkey) return;
    void setGlobalShortcut(settings.hotkey, () => void toggleMainWindow()).catch(
      (e) => console.error("단축키 등록 실패", e),
    );
  }, [settings.hotkey]);

  // 트레이 "새 메모" 메뉴
  const newNoteRef = useRef<() => void>(() => {});
  useEffect(() => {
    let un: UnlistenFn | undefined;
    void listen("tray-new-note", () => newNoteRef.current()).then(
      (f) => (un = f),
    );
    return () => un?.();
  }, []);

  function toggleAutostart(on: boolean) {
    setAutostartState(on);
    void setAutostart(on).catch((e) => console.error("자동시작 설정 실패", e));
  }

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const committedWidth =
    mode === "note" && selected ? selected.panelWidth : PANEL_DEFAULT_WIDTH;
  const panelWidth = dragWidth ?? committedWidth;

  const bookmarkNotes = notes
    .filter((n) => n.showAsBookmark && !n.isArchived && !n.deletedAt)
    .sort((a, b) => (a.bookmarkOrder ?? 0) - (b.bookmarkOrder ?? 0));

  const sizeWindow = useCallback(async (width: number, expanded: boolean) => {
    const height = await edgeWindowHeight();
    const w = expanded ? RIBBON_COLUMN_WIDTH + width : RIBBON_COLUMN_WIDTH;
    await placeAtRightEdge({ width: w, height });
  }, []);

  // 패널 상태·너비가 바뀔 때마다 화면 전체 높이로 다시 맞춘다 (HMR/재시작 없이도 반영)
  useEffect(() => {
    const expanded = panelOpen || mode !== "collapsed";
    void sizeWindow(expanded ? panelWidth : 0, expanded);
  }, [panelOpen, mode, panelWidth, sizeWindow]);

  const collapse = useCallback(
    () => sizeWindow(0, false),
    [sizeWindow],
  );

  const openContent = useCallback(
    async (next: Mode, width: number) => {
      const wasCollapsed = mode === "collapsed";
      setMode(next);
      await sizeWindow(width, true);
      if (wasCollapsed) requestAnimationFrame(() => setPanelOpen(true));
      else setPanelOpen(true);
    },
    [mode, sizeWindow],
  );

  const close = useCallback(() => {
    void flush();
    setPanelOpen(false);
  }, [flush]);

  function handlePrimary() {
    if (mode === "list") {
      close();
    } else if (mode === "note") {
      void flush();
      fromList.current = false;
      setSelectedId(null);
      setMode("list");
      void sizeWindow(PANEL_DEFAULT_WIDTH, true);
    } else {
      fromList.current = false;
      void openContent("list", PANEL_DEFAULT_WIDTH);
    }
  }

  function handleItem(id: string) {
    const target = notes.find((n) => n.id === id);
    if (target?.isPanelPinned) {
      void openPinnedWindow(target); // 고정된 메모는 자기 창으로 포커스
      return;
    }
    if (id !== selectedId) void flush();
    fromList.current = false;
    setSelectedId(id);
    void openContent("note", target?.panelWidth ?? PANEL_DEFAULT_WIDTH);
  }

  function openNoteFromList(id: string) {
    const target = notes.find((n) => n.id === id);
    if (target?.isPanelPinned) {
      void openPinnedWindow(target);
      return;
    }
    fromList.current = true;
    setSelectedId(id);
    setMode("note");
    void sizeWindow(target?.panelWidth ?? PANEL_DEFAULT_WIDTH, true);
  }

  function newNote() {
    const iso = todayIso();
    const note: Note = {
      id: crypto.randomUUID(),
      title: "",
      content: EMPTY_DOC,
      contentText: "",
      noteDate: iso,
      createdAt: iso,
      updatedAt: iso,
      importance: "normal",
      showAsBookmark: false,
      bookmarkOrder: null,
      color: PASTEL_PALETTE.yellow,
      opacity: 1,
      panelWidth: PANEL_DEFAULT_WIDTH,
      isPanelPinned: false,
      isArchived: false,
      deletedAt: null,
    };
    void flush();
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
    fromList.current = mode === "list";
    void saveNow(note);
    if (mode === "collapsed") void openContent("note", PANEL_DEFAULT_WIDTH);
    else {
      setMode("note");
      void sizeWindow(PANEL_DEFAULT_WIDTH, true);
    }
  }
  newNoteRef.current = newNote;

  function patchSelected(patch: Partial<Note>) {
    if (!selected) return;
    const updated = { ...selected, ...patch, updatedAt: todayIso() };
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    // 고정 토글: 별도 창으로 분리/회수
    if (patch.isPanelPinned === true) {
      void saveNow(updated); // 창이 DB에서 읽으므로 먼저 저장
      void openPinnedWindow(updated);
      setPanelOpen(false); // 메인 패널은 접는다(창으로 이동)
      return;
    }
    if (patch.isPanelPinned === false) {
      void closePinnedWindow(updated.id);
    }
    scheduleSave(updated);
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.screenX;
    const startW = panelWidth;
    const noteId = selectedId;
    let latest = startW;
    let raf = 0;
    const onMove = (ev: PointerEvent) => {
      const delta = startX - ev.screenX; // 왼쪽으로 끌면 넓어짐
      latest = Math.min(
        PANEL_MAX_WIDTH,
        Math.max(PANEL_MIN_WIDTH, startW + delta),
      );
      setDragWidth(latest);
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          void sizeWindow(latest, true);
        });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (raf) cancelAnimationFrame(raf);
      void sizeWindow(latest, true);
      setDragWidth(null);
      if (mode === "note" && noteId) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId
              ? { ...n, panelWidth: latest, updatedAt: todayIso() }
              : n,
          ),
        );
        const target = notes.find((n) => n.id === noteId);
        if (target)
          scheduleSave({ ...target, panelWidth: latest, updatedAt: todayIso() });
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function deleteNote(id: string) {
    deleteNotes([id]);
  }

  function deleteNotes(ids: string[]) {
    if (ids.length === 0) return;
    cancelSave();
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    setNotes((prev) =>
      prev.map((n) =>
        idSet.has(n.id) ? { ...n, deletedAt: now } : n,
      ),
    );
    for (const id of ids) void closePinnedWindow(id);
    void Promise.all(ids.map((id) => softDeleteNote(id))).then(emitNotesChanged);
    if (selectedId && idSet.has(selectedId)) {
      setSelectedId(null);
      setPanelOpen(false);
    }
  }

  function restore(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, deletedAt: null } : n)),
    );
    void restoreNote(id).then(emitNotesChanged);
  }

  function permanentDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    void closePinnedWindow(id);
    void hardDeleteNote(id).then(emitNotesChanged);
  }

  function reorderBookmarks(orderedIds: string[]) {
    setNotes((prev) =>
      prev.map((n) => {
        const idx = orderedIds.indexOf(n.id);
        return idx >= 0 ? { ...n, bookmarkOrder: idx } : n;
      }),
    );
    void setBookmarkOrders(
      orderedIds.map((id, order) => ({ id, order })),
    ).then(emitNotesChanged);
  }

  async function restoreFromBackupFile(backup: BookmarkBackup) {
    cancelSave();
    await flush();
    try {
      await closeAllPinnedWindows();
    } catch (e) {
      console.warn("고정 창 닫기 실패(무시)", e);
    }
    await restoreFromBackup(backup.notes, backup.settings);
    const all = await listAllNotes();
    setNotes(all);
    setSelectedId(null);
    setPanelOpen(false);
    setMode("collapsed");
    const s = backup.settings;
    updateSettings({
      bookmarkOpacity: numSetting(s.bookmarkOpacity, DEFAULT_BOOKMARK_OPACITY),
      panelOpacity: numSetting(s.panelOpacity, DEFAULT_PANEL_OPACITY),
      hotkey: s.hotkey ?? DEFAULT_HOTKEY,
      guideSeen: s.guideSeen === "1",
    });
    try {
      await reopenPinnedWindows(all);
    } catch (e) {
      console.warn("고정 창 복원 실패(무시)", e);
    }
    emitNotesChanged();
    void sizeWindow(0, false);
  }

  function numSetting(v: string | undefined, fallback: number): number {
    const n = v === undefined ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function onPanelTransitionEnd() {
    if (!panelOpen) {
      setMode("collapsed");
      setSelectedId(null);
      void collapse();
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && mode !== "collapsed") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, close]);

  // 첫 실행 가이드: 창을 펼쳐 안내를 보여준다
  const showGuide = settingsLoaded && !settings.guideSeen;
  useEffect(() => {
    if (showGuide) void sizeWindow(PANEL_DEFAULT_WIDTH, true);
  }, [showGuide, sizeWindow]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div
        onTransitionEnd={onPanelTransitionEnd}
        style={{
          width: panelWidth,
          right: RIBBON_COLUMN_WIDTH,
          opacity: settings.panelOpacity,
          transform: panelOpen
            ? "translateX(0)"
            : `translateX(${panelWidth + RIBBON_COLUMN_WIDTH}px)`,
          transitionDuration: `${PANEL_MOTION_MS}ms`,
        }}
        className="absolute top-0 bottom-0 z-10 p-2 pr-3 transition-transform ease-out"
      >
        {mode === "note" && (
          <div
            onPointerDown={startResize}
            title="드래그하여 패널 너비 조절"
            className="absolute top-0 bottom-0 left-0 z-20 w-1.5 cursor-ew-resize hover:bg-slate-400/40"
            style={{ touchAction: "none" }}
          />
        )}
        {mode === "note" && selected ? (
          <NotePanel
            note={selected}
            saveStatus={saveStatus}
            saveError={saveError}
            onChange={patchSelected}
            onClose={close}
            onDelete={deleteNote}
            onBack={fromList.current ? () => setMode("list") : undefined}
          />
        ) : mode === "list" ? (
          <NoteList
            notes={notes}
            settings={settings}
            autostart={autostart}
            onChangeSettings={updateSettings}
            onToggleAutostart={toggleAutostart}
            onOpenNote={openNoteFromList}
            onNewNote={newNote}
            onRestore={restore}
            onRestoreBackup={restoreFromBackupFile}
            onDelete={deleteNotes}
            onPermanentDelete={permanentDelete}
            onClose={close}
          />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute top-0 right-0 bottom-0 z-0"
        style={{ width: RIBBON_COLUMN_WIDTH, opacity: settings.bookmarkOpacity }}
      >
        <div className="pointer-events-auto h-full">
        <EdgeRibbons
          bookmarkNotes={bookmarkNotes}
          selectedNoteId={selectedId}
          listOpen={mode === "list"}
          onPrimaryClick={handlePrimary}
          onItemClick={handleItem}
          onReorder={reorderBookmarks}
        />
        </div>
      </div>

      {showGuide && (
        <GuideOverlay
          hotkey={settings.hotkey}
          onClose={() => {
            updateSettings({ guideSeen: true });
            if (mode === "collapsed") void collapse();
          }}
        />
      )}
    </div>
  );
}

export default App;
