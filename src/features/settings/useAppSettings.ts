import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BOOKMARK_OPACITY,
  DEFAULT_PANEL_OPACITY,
  DEFAULT_HOTKEY,
} from "@/constants/design";
import { getSetting, setSetting } from "@/lib/db";

// 앱 설정. SQLite settings 테이블에 저장한다.
export interface AppSettings {
  bookmarkOpacity: number;
  panelOpacity: number;
  hotkey: string;
  guideSeen: boolean;
}

const KEYS = {
  bookmarkOpacity: "bookmarkOpacity",
  panelOpacity: "panelOpacity",
  hotkey: "hotkey",
  guideSeen: "guideSeen",
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  bookmarkOpacity: DEFAULT_BOOKMARK_OPACITY,
  panelOpacity: DEFAULT_PANEL_OPACITY,
  hotkey: DEFAULT_HOTKEY,
  guideSeen: false,
};

function num(v: string | null, fallback: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [b, p, hk, gs] = await Promise.all([
        getSetting(KEYS.bookmarkOpacity),
        getSetting(KEYS.panelOpacity),
        getSetting(KEYS.hotkey),
        getSetting(KEYS.guideSeen),
      ]);
      setSettings({
        bookmarkOpacity: num(b, DEFAULT_BOOKMARK_OPACITY),
        panelOpacity: num(p, DEFAULT_PANEL_OPACITY),
        hotkey: hk ?? DEFAULT_HOTKEY,
        guideSeen: gs === "1",
      });
      setLoaded(true);
    })();
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.bookmarkOpacity !== undefined)
        void setSetting(KEYS.bookmarkOpacity, String(next.bookmarkOpacity));
      if (patch.panelOpacity !== undefined)
        void setSetting(KEYS.panelOpacity, String(next.panelOpacity));
      if (patch.hotkey !== undefined) void setSetting(KEYS.hotkey, next.hotkey);
      if (patch.guideSeen !== undefined)
        void setSetting(KEYS.guideSeen, next.guideSeen ? "1" : "0");
      return next;
    });
  }, []);

  return { settings, loaded, update };
}
