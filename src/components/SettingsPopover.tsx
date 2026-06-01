import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { OPACITY_MIN, OPACITY_MAX } from "@/constants/design";
import { prettyHotkeyText } from "@/lib/hotkey";
import { exportBackupFile, pickAndValidateBackup } from "@/lib/backup";
import type { BookmarkBackup } from "@/types/backup";
import type { AppSettings } from "@/features/settings/useAppSettings";
import { ConfirmDialog } from "./ConfirmDialog";

interface SettingsPopoverProps {
  settings: AppSettings;
  autostart: boolean;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggleAutostart: (on: boolean) => void;
  onRestore: (backup: BookmarkBackup) => Promise<void>;
  onClose: () => void;
}

export function SettingsPopover({
  settings,
  autostart,
  onChange,
  onToggleAutostart,
  onRestore,
  onClose,
}: SettingsPopoverProps) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState<BookmarkBackup | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setMsg(null);
    setBusy(true);
    try {
      const path = await exportBackupFile();
      if (path) setMsg({ text: "백업을 저장했습니다.", ok: true });
    } catch (e) {
      setMsg({
        text: e instanceof Error ? e.message : "백업 저장에 실패했습니다.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleImportPick() {
    setMsg(null);
    setBusy(true);
    try {
      const backup = await pickAndValidateBackup();
      if (backup) setPending(backup);
    } catch (e) {
      setMsg({
        text: e instanceof Error ? e.message : "백업 파일을 읽을 수 없습니다.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreConfirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await onRestore(pending);
      setPending(null);
      setMsg({ text: "백업에서 복원했습니다.", ok: true });
    } catch (e) {
      console.error("복원 실패", e);
      setMsg({
        text:
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "복원에 실패했습니다.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-12 right-2 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
        <p className="mb-2 text-xs font-semibold text-slate-500">투명도</p>
        <OpacitySlider
          label="책갈피"
          value={settings.bookmarkOpacity}
          onChange={(v) => onChange({ bookmarkOpacity: v })}
        />
        <OpacitySlider
          label="패널"
          value={settings.panelOpacity}
          onChange={(v) => onChange({ panelOpacity: v })}
        />

        <div className="my-2 border-t border-slate-100" />

        <p className="mb-1.5 text-xs font-semibold text-slate-500">
          전역 단축키 (창 열기/숨기기)
        </p>
        <HotkeyRecorder
          value={settings.hotkey}
          onChange={(hk) => onChange({ hotkey: hk })}
        />

        <div className="my-2 border-t border-slate-100" />

        <label className="flex cursor-pointer items-center justify-between text-xs text-slate-600">
          <span>Windows 시작 시 자동 실행</span>
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => onToggleAutostart(e.target.checked)}
            className="h-4 w-4 accent-slate-700"
          />
        </label>

        <div className="my-2 border-t border-slate-100" />

        <p className="mb-1.5 text-xs font-semibold text-slate-500">데이터</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={14} />
            백업
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleImportPick()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload size={14} />
            복원
          </button>
        </div>
        {msg && (
          <p
            className={[
              "mt-2 text-xs",
              msg.ok ? "text-slate-500" : "text-rose-500",
            ].join(" ")}
          >
            {msg.text}
          </p>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          message="백업에서 복원할까요?"
          detail={`메모 ${pending.notes.length}개와 설정으로 현재 데이터를 모두 덮어씁니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="복원"
          danger
          onConfirm={() => void handleRestoreConfirm()}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

function normalizeKey(e: React.KeyboardEvent): string | null {
  const k = e.key;
  if (/^[a-zA-Z0-9]$/.test(k)) return k.toUpperCase();
  if (/^F\d{1,2}$/.test(k)) return k;
  const map: Record<string, string> = {
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    " ": "Space",
    Enter: "Enter",
    Backspace: "Backspace",
    Tab: "Tab",
  };
  return map[k] ?? null;
}

function HotkeyRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (hk: string) => void;
}) {
  const [recording, setRecording] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(e) => {
        if (!recording) return;
        e.preventDefault();
        const mods: string[] = [];
        if (e.ctrlKey || e.metaKey) mods.push("CommandOrControl");
        if (e.altKey) mods.push("Alt");
        if (e.shiftKey) mods.push("Shift");
        const key = normalizeKey(e);
        if (!key || mods.length === 0) return; // 수정자 + 일반키 조합 필요
        onChange([...mods, key].join("+"));
        setRecording(false);
      }}
      className={[
        "w-full rounded-md border px-2 py-1.5 text-center text-xs",
        recording
          ? "border-slate-400 bg-slate-50 text-slate-500"
          : "border-slate-200 text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {recording ? "키 조합을 누르세요..." : prettyHotkeyText(value)}
    </button>
  );
}

function OpacitySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-2 block">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums text-slate-400">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={OPACITY_MIN}
        max={OPACITY_MAX}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-700"
      />
    </label>
  );
}
