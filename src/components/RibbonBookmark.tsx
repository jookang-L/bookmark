import { Star, AlertCircle, Bookmark as BookmarkIcon } from "lucide-react";
import type { Importance } from "@/types/note";

interface RibbonBookmarkProps {
  kind: "primary" | "item";
  /** 책갈피 배경 색 (개별 메모 색) */
  color?: string;
  /** 마우스 오버 시 표시할 제목(툴팁) */
  title: string;
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
  importance = "normal",
  selected = false,
  height,
  width,
  onClick,
}: RibbonBookmarkProps) {
  const isPrimary = kind === "primary";
  const showStar = importance === "important";
  const showBang = importance === "critical";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        height,
        width,
        backgroundColor: isPrimary ? "#475569" : color,
        ...ribbonTail,
      }}
      className={[
        "group relative flex items-start justify-center rounded-l-lg pt-2 shadow-md transition-all duration-150",
        "hover:-translate-x-0.5 hover:shadow-lg",
        selected ? "-translate-x-1 ring-2 ring-slate-400 ring-offset-0" : "",
      ].join(" ")}
    >
      {isPrimary ? (
        <BookmarkIcon size={16} className="text-white" />
      ) : (
        <span className="flex flex-col items-center gap-1">
          {showStar && (
            <Star size={11} className="fill-amber-500 text-amber-500" />
          )}
          {showBang && <AlertCircle size={11} className="text-rose-600" />}
        </span>
      )}
    </button>
  );
}
