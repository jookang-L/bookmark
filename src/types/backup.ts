import type { Note } from "./note";

/** .bookmark 백업 파일 형식 (schemaVersion 1) */
export interface BookmarkBackup {
  appName: "Bookmark";
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  notes: Note[];
  settings: Record<string, string>;
}

export const BACKUP_SCHEMA_VERSION = 1;
