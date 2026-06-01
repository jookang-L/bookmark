interface ConfirmDialogProps {
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  message,
  detail,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 p-4">
      <div className="w-full max-w-xs rounded-xl bg-white p-4 shadow-xl">
        <p className="text-sm font-semibold text-slate-800">{message}</p>
        {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              "rounded-md px-3 py-1.5 text-sm font-medium text-white",
              danger
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-slate-800 hover:bg-slate-900",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
