import { PASTEL_PALETTE } from "@/constants/design";

const COLORS = Object.values(PASTEL_PALETTE);

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="group"
      aria-label="책갈피 색상"
    >
      {COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            title="책갈피 색상"
            aria-label={`색상 ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={[
              "h-5 w-5 rounded-full border-2 transition-transform",
              selected
                ? "scale-110 border-slate-600"
                : "border-white/90 hover:scale-105",
            ].join(" ")}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
