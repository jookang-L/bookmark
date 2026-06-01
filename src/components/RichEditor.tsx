import { useEffect, useReducer, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Highlighter,
  ListChecks,
  Undo2,
  Redo2,
  CalendarPlus,
} from "lucide-react";
import { parseContent } from "@/lib/tiptapContent";
import { todayInsertText } from "@/lib/date";
import { openExternal } from "@/lib/system";

interface RichEditorProps {
  /** 노트 식별자: 바뀌면 에디터 내용을 교체한다 */
  noteId: string;
  initialContent: string;
  onChange: (json: string, text: string) => void;
}

export function RichEditor({
  noteId,
  initialContent,
  onChange,
}: RichEditorProps) {
  const [, force] = useReducer((x) => x + 1, 0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // 프로그램적 내용 교체 중 onUpdate 저장을 막는 플래그
  const applying = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, linkOnPaste: true },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: parseContent(initialContent) ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-content",
      },
    },
    onUpdate: ({ editor }) => {
      if (applying.current) return;
      onChangeRef.current(JSON.stringify(editor.getJSON()), editor.getText());
    },
  });

  // 활성 상태(굵게/강조 등) 반영을 위해 트랜잭션마다 리렌더
  useEffect(() => {
    if (!editor) return;
    const onTx = () => force();
    editor.on("transaction", onTx);
    return () => {
      editor.off("transaction", onTx);
    };
  }, [editor]);

  // 다른 메모로 전환되면 내용 교체 (저장 이벤트 발생 안 함)
  useEffect(() => {
    if (!editor) return;
    applying.current = true;
    editor.commands.setContent(parseContent(initialContent) ?? "", {
      emitUpdate: false,
    });
    applying.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, noteId]);

  if (!editor) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-0.5 px-3 pb-1">
        <ToolBtn
          title="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn
          title="형광펜 강조"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={15} />
        </ToolBtn>
        <ToolBtn
          title="체크박스 목록"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks size={15} />
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <ToolBtn
          title="실행 취소"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolBtn>
        <ToolBtn
          title="다시 실행"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <ToolBtn
          title="커서 위치에 오늘 날짜 삽입"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent(todayInsertText() + " ")
              .run()
          }
        >
          <CalendarPlus size={15} />
        </ToolBtn>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onClick={(e) => {
          const a = (e.target as HTMLElement).closest("a");
          const href = a?.getAttribute("href");
          if (href) {
            e.preventDefault();
            void openExternal(href);
          }
        }}
      >
        <EditorContent editor={editor} className="px-4 py-2" />
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  title,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-md p-1.5 transition-colors",
        disabled
          ? "cursor-not-allowed text-slate-300"
          : active
            ? "bg-slate-800 text-white"
            : "text-slate-500 hover:bg-black/5 hover:text-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
