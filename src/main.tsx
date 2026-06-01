import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { PinnedNoteWindow } from "./components/PinnedNoteWindow";
import { noteIdFromLabel } from "./windows/pinned";
import "./styles/index.css";

const label = getCurrentWindow().label;
const pinnedId = noteIdFromLabel(label);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {pinnedId ? <PinnedNoteWindow noteId={pinnedId} /> : <App />}
  </React.StrictMode>,
);
