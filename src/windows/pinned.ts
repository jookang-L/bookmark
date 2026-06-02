import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";
import { availableMonitors } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import type { Note } from "@/types/note";
import { getWinGeo, type WinGeo } from "@/lib/db";
import { EDGE_EXPANDED_HEIGHT } from "@/constants/design";

/** 저장된 창 위치가 현재 어느 모니터에도 충분히 안 걸치면(해상도/모니터 변경) false */
async function isGeoVisible(geo: WinGeo): Promise<boolean> {
  try {
    const monitors = await availableMonitors();
    return monitors.some((m) => {
      const overlapX =
        Math.min(geo.x + geo.w, m.position.x + m.size.width) -
        Math.max(geo.x, m.position.x);
      const overlapY =
        Math.min(geo.y + geo.h, m.position.y + m.size.height) -
        Math.max(geo.y, m.position.y);
      return overlapX > 60 && overlapY > 40;
    });
  } catch {
    return true; // 확인 불가 시 그대로 사용
  }
}

const PREFIX = "note-";

export function pinnedLabel(id: string): string {
  return PREFIX + id;
}

export function noteIdFromLabel(label: string): string | null {
  return label.startsWith(PREFIX) ? label.slice(PREFIX.length) : null;
}

/** 고정 메모 창을 연다(이미 있으면 포커스). */
export async function openPinnedWindow(note: Note): Promise<void> {
  const label = pinnedLabel(note.id);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const geo = await getWinGeo(note.id);
  const win = new WebviewWindow(label, {
    url: "index.html",
    title: note.title || "메모",
    width: note.panelWidth,
    height: EDGE_EXPANDED_HEIGHT,
    minWidth: 280,
    minHeight: 240,
    decorations: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    visible: false,
  });

  win.once("tauri://created", () => {
    void (async () => {
      if (geo && (await isGeoVisible(geo))) {
        await win.setSize(new PhysicalSize(geo.w, geo.h));
        await win.setPosition(new PhysicalPosition(geo.x, geo.y));
      } else {
        if (geo) await win.setSize(new PhysicalSize(geo.w, geo.h));
        await win.center(); // 화면 밖이면 중앙으로 복귀
      }
      // show/focus는 고정 창 webview(main.tsx)에서 UI 준비 후 수행
    })();
  });

  win.once("tauri://error", (e) => {
    console.error("고정 창 생성 실패", e);
  });
}

export async function closePinnedWindow(id: string): Promise<void> {
  const win = await WebviewWindow.getByLabel(pinnedLabel(id));
  if (win) await win.close();
}

/** 복원 전 등: 고정 메모 창을 모두 닫는다. */
export async function closeAllPinnedWindows(): Promise<void> {
  for (const w of await getAllWebviewWindows()) {
    if (noteIdFromLabel(w.label)) await w.close();
  }
}

/** 앱 시작 시 고정된 메모들의 창을 모두 연다. */
export async function reopenPinnedWindows(notes: Note[]): Promise<void> {
  for (const n of notes) {
    if (n.isPanelPinned && !n.isArchived && !n.deletedAt) {
      await openPinnedWindow(n);
    }
  }
}
