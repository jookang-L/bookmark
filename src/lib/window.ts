import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";

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

/** 첫 표시: 배치 후 보이게 한다(초기 위치 깜빡임 방지). */
export async function showPlaced(box: WinBox): Promise<void> {
  await placeAtRightEdge(box);
  await getCurrentWindow().show();
}
