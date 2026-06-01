import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";

/** Windows 작업표시줄 등에 앱 아이콘을 명시적으로 적용한다. */
export async function applyAppWindowIcon(): Promise<void> {
  try {
    await invoke("apply_window_icon");
  } catch (e) {
    console.warn("작업표시줄 아이콘 적용 실패", e);
  }
}

export interface WinBox {
  width: number;
  height: number;
}

/** 현재 모니터의 논리 높이(px). 책갈피 열 창이 화면 오른쪽 전체를 쓸 때 사용한다. */
export async function edgeWindowHeight(): Promise<number> {
  const mon = await currentMonitor();
  if (!mon) return 800;
  return Math.round(mon.size.height / mon.scaleFactor);
}

/**
 * 창을 현재 모니터 오른쪽 가장자리·상단에 맞춘다.
 * height는 보통 edgeWindowHeight()로 화면 전체 높이를 넘긴다.
 */
export async function placeAtRightEdge(box: WinBox): Promise<void> {
  const win = getCurrentWindow();
  await win.setSize(new LogicalSize(box.width, box.height));

  const mon = await currentMonitor();
  if (!mon) return;

  const sf = mon.scaleFactor;
  const physW = Math.round(box.width * sf);

  const x = mon.position.x + mon.size.width - physW;
  const y = mon.position.y;

  await win.setPosition(new PhysicalPosition(x, y));
}

/** WebView2가 첫 프레임을 그릴 때까지 대기 */
export function waitForUiReady(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Windows 투명 창 첫 표시 시 흰 띠가 남는 WebView2 버그 완화 */
async function nudgeWindowRepaint(
  win: ReturnType<typeof getCurrentWindow>,
  width: number,
  height: number,
): Promise<void> {
  try {
    await win.setSize(new LogicalSize(width + 1, height));
    await win.setSize(new LogicalSize(width, height));
  } catch {
    // 무시
  }
}

/**
 * 창을 배치한 뒤 UI가 준비되면 표시한다.
 * CSS/React 적용 전 show()를 호출하면 흰 세로 띠가 보일 수 있다.
 */
export async function revealPlacedWindow(box: WinBox): Promise<void> {
  await placeAtRightEdge(box);
  await waitForUiReady();
  document.documentElement.classList.add("app-ready");
  const win = getCurrentWindow();
  await win.show();
  await waitForUiReady();
  await nudgeWindowRepaint(win, box.width, box.height);
}

/** @deprecated revealPlacedWindow 사용 */
export async function showPlaced(box: WinBox): Promise<void> {
  await revealPlacedWindow(box);
}
