import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const shortcuts: [string, string][][] = [
  [
    ['Space', 'Open / Close Quick Look'],
    ['← →', 'Navigate assets in Quick Look'],
    ['⌘A', 'Select all visible assets'],
    ['Drag', 'Rubber-band select multiple assets'],
    ['⇧ Click', 'Range select'],
    ['⌘ Click', 'Add to selection'],
  ],
  [
    ['1 – 5', 'Rate selected assets'],
    ['0', 'Clear rating'],
    ['Delete', 'Move selected to Trash'],
    ['⌘Z', 'Undo last delete'],
    ['⌘V', 'Paste image to import'],
    ['Esc', 'Close preview / clear selection'],
    ['⌘/', 'Show shortcuts'],
  ],
];

export default function ShortcutOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setIsOpen(current => !current);
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setIsOpen(true);
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div
        className="w-[min(640px,calc(100vw-2rem))] rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-200 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-100">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close shortcuts"
          >
            <X size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          {shortcuts.map((group, gi) => (
            <div key={gi} className="space-y-0.5">
              {group.map(([keys, description]) => (
                <div key={keys} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-xs">
                  <kbd className="shrink-0 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-center font-semibold text-zinc-200 shadow-sm min-w-[72px]">
                    {keys}
                  </kbd>
                  <span className="text-zinc-400 text-[11px]">{description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
