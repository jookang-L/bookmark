import { useState } from "react";
import { Star, AlertCircle, Bookmark as BookmarkIcon, Bell } from "lucide-react";
import type { Importance } from "@/types/note";

interface RibbonBookmarkProps {
  kind: "primary" | "item";
  /** 책갈피 배경 색 (개별 메모 색) */
  color?: string;
  /** 마우스 오버 시 표시할 제목 */
  title: string;
  /** 마우스 오버 시 표시할 본문 미리보기 */
  preview?: string;
  hasReminder?: boolean;
  importance?: Importance;
  selected?: boolean;
  height: number;
  width: number;
  onClick?: () => void;
}

// 끝부분이 접힌 리본 모양 (아래쪽 V 노치)
const ribbonTail = {
  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)",
};

export function RibbonBookmark({
  kind,
  color,
  title,
  preview,
  hasReminder = false,
  importance = "normal",
  selected = false,
  height,
  width,
  onClick,
}: RibbonBookmarkProps) {
  const isPrimary = kind === "primary";
  const showStar = importance === "important";
  const showBang = importance === "critical";
  const [hovered, setHovered] = useState(false);
  const showCustomTip = !isPrimary && (title || preview);

  return (
    <button
      type="button"
      title={isPrimary ? title : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height,
        width,
        backgroundColor: isPrimary ? "#475569" : color,
        ...ribbonTail,
      }}
      className={[
        "group relative flex items-start justify-center rounded-l-md pt-2 shadow-md transition-shadow duration-150",
        "hover:shadow-lg",
        selected ? "ring-2 ring-slate-400 ring-offset-0" : "",
      ].join(" ")}
    >
      {showCustomTip && hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-1/2 right-full z-50 mr-2 max-w-[260px] -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg"
        >
          <p className="text-sm font-medium text-slate-800">
            {title || "제목 없음"}
          </p>
          {preview && (
            <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-slate-500">
              {preview}
            </p>
          )}
          {hasReminder && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
              <Bell size={11} />
              알림 예정
            </p>
          )}
        </div>
      )}
      {isPrimary ? (
        <BookmarkIcon size={16} className="text-white" />
      ) : (
        <span className="relative flex flex-col items-center gap-1">
          {showStar && (
            <Star size={11} className="fill-amber-500 text-amber-500" />
          )}
          {showBang && <AlertCircle size={11} className="text-rose-600" />}
          {hasReminder && (
            <Bell
              size={10}
              className="absolute -bottom-1 text-amber-700 drop-shadow-sm"
            />
          )}
        </span>
      )}
    </button>
  );
}
