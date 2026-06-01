/** 단축키 문자열을 사람이 읽기 좋게 변환: "CommandOrControl+Shift+B" → "Ctrl + Shift + B" */
export function prettyHotkeyText(hk: string): string {
  return hk.replace("CommandOrControl", "Ctrl").split("+").join(" + ");
}
