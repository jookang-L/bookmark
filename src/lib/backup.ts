import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { format } from "date-fns";
import type { Note, Importance } from "@/types/note";
import {
  type BookmarkBackup,
  BACKUP_SCHEMA_VERSION,
} from "@/types/backup";
import { APP_NAME } from "@/constants/design";
import { listAllNotes, listAllSettings } from "@/lib/db";

const APP_VERSION = "0.1.0";

const IMPORTANCE_SET = new Set<Importance>([
  "low",
  "normal",
  "important",
  "critical",
]);

function parseNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  if (typeof o.title !== "string") return null;
  if (typeof o.content !== "string") return null;
  if (typeof o.contentText !== "string") return null;
  if (typeof o.noteDate !== "string") return null;
  if (typeof o.createdAt !== "string") return null;
  if (typeof o.updatedAt !== "string") return null;
  if (!IMPORTANCE_SET.has(o.importance as Importance)) return null;
  if (typeof o.showAsBookmark !== "boolean") return null;
  if (o.bookmarkOrder !== null && typeof o.bookmarkOrder !== "number")
    return null;
  if (typeof o.color !== "string") return null;
  if (typeof o.opacity !== "number") return null;
  if (typeof o.panelWidth !== "number") return null;
  if (typeof o.isPanelPinned !== "boolean") return null;
  if (typeof o.isArchived !== "boolean") return null;
  if (o.deletedAt !== null && typeof o.deletedAt !== "string") return null;

  return {
    id: o.id,
    title: o.title,
    content: o.content,
    contentText: o.contentText,
    noteDate: o.noteDate,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    importance: o.importance as Importance,
    showAsBookmark: o.showAsBookmark,
    bookmarkOrder: o.bookmarkOrder as number | null,
    color: o.color,
    opacity: o.opacity,
    panelWidth: o.panelWidth,
    isPanelPinned: o.isPanelPinned,
    isArchived: o.isArchived,
    deletedAt: o.deletedAt as string | null,
  };
}

function parseSettings(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "string") return null;
    out[k] = v;
  }
  return out;
}

/** 백업 JSON 검증. 실패 시 throw. */
export function validateBackup(raw: unknown): BookmarkBackup {
  if (!raw || typeof raw !== "object") {
    throw new Error("파일 형식이 올바르지 않습니다.");
  }
  const o = raw as Record<string, unknown>;
  if (o.appName !== APP_NAME) {
    throw new Error("Bookmark 백업 파일이 아닙니다.");
  }
  if (typeof o.schemaVersion !== "number" || o.schemaVersion < 1) {
    throw new Error("지원하지 않는 백업 버전입니다.");
  }
  if (o.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `이 앱 버전은 백업 v${o.schemaVersion}을 읽을 수 없습니다. 앱을 업데이트해 주세요.`,
    );
  }
  if (typeof o.exportedAt !== "string") {
    throw new Error("백업 날짜 정보가 없습니다.");
  }
  if (!Array.isArray(o.notes)) {
    throw new Error("메모 데이터가 없습니다.");
  }
  const settings = parseSettings(o.settings);
  if (!settings) {
    throw new Error("설정 데이터 형식이 올바르지 않습니다.");
  }
  const notes: Note[] = [];
  for (let i = 0; i < o.notes.length; i++) {
    const n = parseNote(o.notes[i]);
    if (!n) throw new Error(`메모 ${i + 1}번째 항목 형식이 올바르지 않습니다.`);
    notes.push(n);
  }
  return {
    appName: "Bookmark",
    schemaVersion: o.schemaVersion,
    exportedAt: o.exportedAt,
    appVersion: typeof o.appVersion === "string" ? o.appVersion : "unknown",
    notes,
    settings,
  };
}

export async function buildBackupPayload(): Promise<BookmarkBackup> {
  const [notes, settings] = await Promise.all([
    listAllNotes(),
    listAllSettings(),
  ]);
  return {
    appName: "Bookmark",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    notes,
    settings,
  };
}

/** 백업 파일로 내보내기. 취소 시 null. */
export async function exportBackupFile(): Promise<string | null> {
  const payload = await buildBackupPayload();
  const defaultName = `bookmark-backup-${format(new Date(), "yyyy-MM-dd")}.bookmark`;
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "Bookmark 백업", extensions: ["bookmark"] }],
  });
  if (!path) return null;
  await writeTextFile(path, JSON.stringify(payload, null, 2));
  return path;
}

/** 백업 파일 읽기·검증. 취소 시 null. */
export async function pickAndValidateBackup(): Promise<BookmarkBackup | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: "Bookmark 백업", extensions: ["bookmark", "json"] }],
  });
  if (!path || typeof path !== "string") return null;
  const text = await readTextFile(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 형식이 아닙니다.");
  }
  return validateBackup(parsed);
}
