import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { PinnedNoteWindow } from "./components/PinnedNoteWindow";
import { ReminderPopupWindow } from "./components/ReminderPopupWindow";
import { noteIdFromLabel } from "./windows/pinned";
import { noteIdFromReminderLabel } from "./windows/reminder";
import { applyAppWindowIcon, markAppUiReady, refreshWindowPaint, waitForUiReady } from "./lib/window";
import "./styles/index.css";

const label = getCurrentWindow().label;
const pinnedId = noteIdFromLabel(label);
const reminderId = noteIdFromReminderLabel(label);

void applyAppWindowIcon();

function Root() {
  if (reminderId) return <ReminderPopupWindow noteId={reminderId} />;
  if (pinnedId) return <PinnedNoteWindow noteId={pinnedId} />;
  return <App />;
}

const root = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

void (async () => {
  await waitForUiReady();
  markAppUiReady();
  if (!pinnedId && !reminderId) return;
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
  await refreshWindowPaint();
})();
