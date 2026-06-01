import { Bookmark, MousePointerClick, Pin, Keyboard } from "lucide-react";
import { prettyHotkeyText } from "@/lib/hotkey";

interface GuideOverlayProps {
  hotkey: string;
  onClose: () => void;
}

export function GuideOverlay({ hotkey, onClose }: GuideOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-3">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800">Bookmark 사용 안내</h2>
        <p className="mt-1 text-xs text-slate-500">
          바탕화면 가장자리 책갈피 메모장입니다.
        </p>

        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <GuideRow icon={<Bookmark size={16} />}>
            화면 오른쪽 가장자리의 책갈피를 클릭하면 메모가 열립니다.
          </GuideRow>
          <GuideRow icon={<MousePointerClick size={16} />}>
            맨 위 대표 책갈피로 전체 목록(검색·정렬·필터·휴지통)을 엽니다.
          </GuideRow>
          <GuideRow icon={<Pin size={16} />}>
            메모의 핀을 켜면 독립 창으로 분리되어 다른 모니터에도 둘 수 있습니다.
          </GuideRow>
          <GuideRow icon={<Keyboard size={16} />}>
            전역 단축키 <b>{prettyHotkeyText(hotkey)}</b> 로 창을 열고 닫을 수
            있습니다. (트레이 아이콘 우클릭 메뉴도 사용 가능)
          </GuideRow>
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

function GuideRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-slate-500">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
