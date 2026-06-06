import { X } from 'lucide-react';
import { useStore } from '../store/AssetContext';

export default function ToastViewport() {
  const { toasts, dismissToast } = useStore();

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-zinc-700/40 bg-zinc-900 px-3 py-2 text-xs font-medium text-white shadow-2xl"
        >
          <div className="min-w-0 flex-1 truncate">{toast.message}</div>
          {toast.action && toast.actionLabel && (
            <button
              onClick={() => {
                toast.action?.();
                dismissToast(toast.id);
              }}
              className="rounded px-2 py-1 text-blue-200 hover:bg-white/10 hover:text-blue-100"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
