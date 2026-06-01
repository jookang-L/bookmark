// TipTap(ProseMirror) 콘텐츠 헬퍼.

export const EMPTY_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

/** 여러 줄 평문을 단순 문단 문서(JSON 문자열)로 변환 (시드 데이터용) */
export function docFromText(text: string): string {
  const content = text.split("\n").map((line) =>
    line.length
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return JSON.stringify({ type: "doc", content });
}

/** 저장된 content 문자열을 TipTap이 받을 수 있는 형태로 파싱 */
export function parseContent(s: string): object | string | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as object;
  } catch {
    return s; // 혹시 HTML/평문이면 그대로 전달
  }
}
