import { useRef } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  formatRemindAt,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/date";
import {
  presetInOneHour,
  presetOnNoteDateMorning,
  presetTodayEvening,
  presetTomorrowMorning,
} from "@/lib/reminder";

interface ReminderEditorProps {
  remindAt: string | null;
  noteDate: string;
  onChange: (remindAt: string | null) => void;
}

export function ReminderEditor({
  remindAt,
  noteDate,
  onChange,
}: ReminderEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  }

  return (
    <div className="border-t border-black/5 bg-white/50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-slate-600 hover:bg-black/5"
          title="알림 일시 설정"
        >
          {remindAt ? (
            <Bell size={15} className="text-amber-600" />
          ) : (
            <BellOff size={15} className="text-slate-400" />
          )}
          <span>
            {remindAt ? `알림: ${formatRemindAt(remindAt)}` : "알림 없음"}
          </span>
          <input
            ref={inputRef}
            type="datetime-local"
            value={remindAt ? toDateTimeLocalValue(remindAt) : ""}
            onChange={(e) => {
              if (!e.target.value) {
                onChange(null);
                return;
              }
              const iso = fromDateTimeLocalValue(e.target.value);
              if (+new Date(iso) <= Date.now()) return;
              onChange(iso);
            }}
            className="sr-only"
            tabIndex={-1}
          />
        </button>
        {remindAt && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md px-2 py-0.5 text-xs text-slate-500 hover:bg-black/5"
          >
            알림 해제
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <PresetBtn label="1시간 후" onClick={() => onChange(presetInOneHour())} />
        <PresetBtn
          label="오늘 18시"
          onClick={() => onChange(presetTodayEvening())}
        />
        <PresetBtn
          label="내일 9시"
          onClick={() => onChange(presetTomorrowMorning())}
        />
        <PresetBtn
          label="메모날짜 9시"
          onClick={() => onChange(presetOnNoteDateMorning(noteDate))}
        />
      </div>
    </div>
  );
}

function PresetBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white/80 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
