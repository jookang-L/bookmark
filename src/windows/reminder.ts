import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { PhysicalPosition } from "@tauri-apps/api/dpi";

const PREFIX = "reminder-";

export function reminderLabel(id: string): string {
  return PREFIX + id;
}

export function noteIdFromReminderLabel(label: string): string | null {
  return label.startsWith(PREFIX) ? label.slice(PREFIX.length) : null;
}

export async function isReminderWindowOpen(id: string): Promise<boolean> {
  return (await WebviewWindow.getByLabel(reminderLabel(id))) !== null;
}

/** 알림 팝업 창을 연다(이미 있으면 포커스). */
export async function openReminderWindow(
  noteId: string,
  stackIndex = 0,
): Promise<void> {
  const label = reminderLabel(noteId);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const win = new WebviewWindow(label, {
    url: "index.html",
    title: "알림",
    width: 440,
    height: 300,
    center: true,
    decorations: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    visible: false,
    focus: true,
  });

  win.once("tauri://created", () => {
    void (async () => {
      if (stackIndex > 0) {
        const pos = await win.outerPosition();
        await win.setPosition(
          new PhysicalPosition(
            pos.x + stackIndex * 28,
            pos.y + stackIndex * 28,
          ),
        );
      }
      await win.show();
      await win.setFocus();
    })();
  });

  win.once("tauri://error", (e) => {
    console.error("알림 창 생성 실패", e);
  });
}

export async function closeReminderWindow(id: string): Promise<void> {
  const win = await WebviewWindow.getByLabel(reminderLabel(id));
  if (win) await win.close();
}
