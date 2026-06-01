import Database from "@tauri-apps/plugin-sql";
import type { Importance, Note } from "@/types/note";
import { TRASH_RETENTION_DAYS } from "@/constants/design";

const DB_URL = "sqlite:bookmark.db";

let dbPromise: Promise<Database> | null = null;

/** DB 연결(캐시). 최초 1회 WAL 모드로 설정해 저장 안정성을 높인다. */
export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load(DB_URL);
      try {
        await db.execute("PRAGMA journal_mode=WAL;");
        await db.execute("PRAGMA busy_timeout=5000;");
        await db.execute("PRAGMA foreign_keys=ON;");
      } catch {
        // PRAGMA 실패는 치명적이지 않음
      }
      return db;
    })();
  }
  return dbPromise;
}

// 모든 쓰기를 직렬화해 SQLite 동시 쓰기 잠금(SQLITE_BUSY)을 방지한다.
let writeChain: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => undefined);
  return run;
}

interface NoteRow {
  id: string;
  title: string;
  content: string;
  content_text: string;
  note_date: string;
  created_at: string;
  updated_at: string;
  importance: string;
  show_as_bookmark: number;
  bookmark_order: number | null;
  color: string;
  opacity: number;
  panel_width: number;
  is_panel_pinned: number;
  is_archived: number;
  deleted_at: string | null;
}

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    contentText: r.content_text,
    noteDate: r.note_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    importance: r.importance as Importance,
    showAsBookmark: r.show_as_bookmark === 1,
    bookmarkOrder: r.bookmark_order,
    color: r.color,
    opacity: r.opacity,
    panelWidth: r.panel_width,
    isPanelPinned: r.is_panel_pinned === 1,
    isArchived: r.is_archived === 1,
    deletedAt: r.deleted_at,
  };
}

export async function listAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.select<NoteRow[]>(
    "SELECT * FROM notes ORDER BY updated_at DESC",
  );
  return rows.map(rowToNote);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<NoteRow[]>("SELECT * FROM notes WHERE id=$1", [
    id,
  ]);
  return rows[0] ? rowToNote(rows[0]) : null;
}

/** 메모 전체 저장(upsert). 상태에 보관 중인 전체 Note를 그대로 기록한다. */
export function saveNote(n: Note): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO notes (
         id, title, content, content_text, note_date, created_at, updated_at,
         importance, show_as_bookmark, bookmark_order, color, opacity,
         panel_width, is_panel_pinned, is_archived, deleted_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        n.id,
        n.title,
        n.content,
        n.contentText,
        n.noteDate,
        n.createdAt,
        n.updatedAt,
        n.importance,
        n.showAsBookmark ? 1 : 0,
        n.bookmarkOrder,
        n.color,
        n.opacity,
        n.panelWidth,
        n.isPanelPinned ? 1 : 0,
        n.isArchived ? 1 : 0,
        n.deletedAt,
      ],
    );
  });
}

/** 책갈피 순서 일괄 저장 */
export function setBookmarkOrders(
  items: { id: string; order: number }[],
): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    for (const it of items) {
      await db.execute("UPDATE notes SET bookmark_order=$1 WHERE id=$2", [
        it.order,
        it.id,
      ]);
    }
  });
}

export function softDeleteNote(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    await db.execute("UPDATE notes SET deleted_at=$1 WHERE id=$2", [
      new Date().toISOString(),
      id,
    ]);
  });
}

export function restoreNote(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    await db.execute("UPDATE notes SET deleted_at=NULL WHERE id=$1", [id]);
  });
}

export function hardDeleteNote(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id=$1", [id]);
  });
}

/** 휴지통에서 30일 지난 메모 영구 삭제 (앱 시작 시 호출) */
export function purgeExpiredTrash(): Promise<number> {
  return enqueueWrite(async () => {
    const db = await getDb();
    const cutoff = new Date(
      Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await db.execute(
      "DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < $1",
      [cutoff],
    );
    return res.rowsAffected;
  });
}

export async function countNotes(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM notes",
  );
  return rows[0]?.c ?? 0;
}

// ---- 설정(settings 테이블) ----

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key=$1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export function setSetting(key: string, value: string): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ($1,$2)
       ON CONFLICT(key) DO UPDATE SET value=$2`,
      [key, value],
    );
  });
}

// ---- 고정 창 위치/크기 기억 (물리 px) ----

export interface WinGeo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function getWinGeo(id: string): Promise<WinGeo | null> {
  const v = await getSetting(`win:${id}`);
  if (!v) return null;
  try {
    return JSON.parse(v) as WinGeo;
  } catch {
    return null;
  }
}

export function setWinGeo(id: string, geo: WinGeo): Promise<void> {
  return setSetting(`win:${id}`, JSON.stringify(geo));
}

// ---- 백업/복원 ----

export async function listAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings",
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** 백업 데이터로 DB 전체 교체. 실패 시 기존 데이터 유지. */
export function restoreFromBackup(
  notes: Note[],
  settings: Record<string, string>,
): Promise<void> {
  return enqueueWrite(async () => {
    const db = await getDb();

    // 현재 데이터 스냅샷(복원 실패 시 되돌리기)
    const prevNotes = await listAllNotes();
    const prevSettings = await listAllSettings();

    const insertNote = async (n: Note) => {
      await db.execute(
        `INSERT INTO notes (
           id, title, content, content_text, note_date, created_at, updated_at,
           importance, show_as_bookmark, bookmark_order, color, opacity,
           panel_width, is_panel_pinned, is_archived, deleted_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          n.id,
          n.title,
          n.content,
          n.contentText,
          n.noteDate,
          n.createdAt,
          n.updatedAt,
          n.importance,
          n.showAsBookmark ? 1 : 0,
          n.bookmarkOrder,
          n.color,
          n.opacity,
          n.panelWidth,
          n.isPanelPinned ? 1 : 0,
          n.isArchived ? 1 : 0,
          n.deletedAt,
        ],
      );
    };

    try {
      await db.execute("DELETE FROM notes");
      await db.execute("DELETE FROM settings");
      for (const n of notes) await insertNote(n);
      for (const [key, value] of Object.entries(settings)) {
        await db.execute(
          "INSERT INTO settings (key, value) VALUES ($1, $2)",
          [key, value],
        );
      }
    } catch (e) {
      // tauri-plugin-sql은 명시적 트랜잭션이 불안정할 수 있어 수동 롤백
      try {
        await db.execute("DELETE FROM notes");
        await db.execute("DELETE FROM settings");
        for (const n of prevNotes) await insertNote(n);
        for (const [key, value] of Object.entries(prevSettings)) {
          await db.execute(
            "INSERT INTO settings (key, value) VALUES ($1, $2)",
            [key, value],
          );
        }
      } catch (rollbackErr) {
        console.error("복원 롤백 실패", rollbackErr);
      }
      throw e;
    }
  });
}
