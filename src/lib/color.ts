// 색상 유틸. 메모 색을 흰색과 섞어 "연하지만 불투명한" 틴트를 만든다.

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * 색을 흰색과 섞은 불투명 색을 반환한다.
 * ratio = 색의 비율(0~1). 작을수록 흰색에 가깝다.
 */
export function tintWithWhite(hex: string, ratio: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) => Math.round(c * ratio + 255 * (1 - ratio));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
