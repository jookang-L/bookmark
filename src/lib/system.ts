import {
  register,
  unregister,
  isRegistered,
} from "@tauri-apps/plugin-global-shortcut";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { waitForUiReady } from "@/lib/window";

/** 메인 창 표시/숨김 토글 (전역 단축키용) */
export async function toggleMainWindow(): Promise<void> {
  const w = getCurrentWindow();
  if (await w.isVisible()) {
    await w.hide();
  } else {
    await w.show();
    await waitForUiReady();
    await w.setFocus();
  }
}

let currentShortcut: string | null = null;

/** 전역 단축키 등록(이전 것은 해제). 실패 시 throw. */
export async function setGlobalShortcut(
  shortcut: string,
  handler: () => void,
): Promise<void> {
  if (currentShortcut && currentShortcut !== shortcut) {
    try {
      if (await isRegistered(currentShortcut)) await unregister(currentShortcut);
    } catch {
      // 무시
    }
  }
  if (!shortcut) {
    currentShortcut = null;
    return;
  }
  if (await isRegistered(shortcut)) await unregister(shortcut);
  await register(shortcut, (e) => {
    if (e.state === "Pressed") handler();
  });
  currentShortcut = shortcut;
}

export async function getAutostart(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostart(on: boolean): Promise<void> {
  const cur = await getAutostart();
  if (on && !cur) await enable();
  if (!on && cur) await disable();
}

/** 본문 링크를 외부 기본 브라우저로 연다. */
export async function openExternal(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch (e) {
    console.error("링크 열기 실패", e);
  }
}
