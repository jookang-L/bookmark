/** 책갈피 툴팁 등에 쓸 본문 미리보기 */
export function notePreviewText(contentText: string, max = 120): string {
  const flat = contentText.replace(/\n/g, " ").trim();
  if (!flat) return "";
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}
