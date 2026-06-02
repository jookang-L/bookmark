import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { PinnedNoteWindow } from "./components/PinnedNoteWindow";
import { noteIdFromLabel } from "./windows/pinned";
import { applyAppWindowIcon, markAppUiReady, refreshWindowPaint, waitForUiReady } from "./lib/window";
import "./styles/index.css";

const label = getCurrentWindow().label;
const pinnedId = noteIdFromLabel(label);

void applyAppWindowIcon();

const root = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    {pinnedId ? <PinnedNoteWindow noteId={pinnedId} /> : <App />}
  </React.StrictMode>,
);

// 고정 창: UI 준비 후 표시 (app-ready는 메인 창만 추가하던 버그 수정)
void (async () => {
  await waitForUiReady();
  markAppUiReady();
  if (!pinnedId) return;
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
  await refreshWindowPaint();
})();
