import type { Note } from "@/types/note";
import { addMinutes, setLocalTime } from "@/lib/date";

/** 알림이 울릴 수 있는 메모인지 */
export function isReminderEligible(note: Note): boolean {
  return !!note.remindAt && !note.isArchived && !note.deletedAt;
}

/** 알림 시각이 지났는지 */
export function isReminderDue(remindAt: string, now = Date.now()): boolean {
  return +new Date(remindAt) <= now;
}

export function snoozeMinutes(minutes: number): string {
  return addMinutes(new Date(), minutes).toISOString();
}

export function snoozeTomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return setLocalTime(d, 9).toISOString();
}

export function presetInOneHour(): string {
  return snoozeMinutes(60);
}

export function presetTodayEvening(): string {
  const d = new Date();
  const target = setLocalTime(d, 18);
  if (target.getTime() <= Date.now()) return snoozeMinutes(60);
  return target.toISOString();
}

export function presetTomorrowMorning(): string {
  return snoozeTomorrowMorning();
}

/** 메모 날짜 당일 오전 9시 */
export function presetOnNoteDateMorning(noteDate: string): string {
  const d = new Date(noteDate);
  const target = setLocalTime(d, 9);
  if (target.getTime() <= Date.now()) return presetTomorrowMorning();
  return target.toISOString();
}
