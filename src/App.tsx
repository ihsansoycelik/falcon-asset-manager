import React from 'react';
import { AssetProvider, useStore } from './store/AssetContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import AssetGrid from './components/AssetGrid';
import Inspector from './components/Inspector';
import ErrorBoundary from './components/ErrorBoundary';
import ShortcutOverlay from './components/ShortcutOverlay';
import ToastViewport from './components/ToastViewport';
import { AlertTriangle, X } from 'lucide-react';

function StorageWarningBanner() {
  const { storageWarning, persistenceError } = useStore();
  const [dismissed, setDismissed] = React.useState(false);

  const message = storageWarning ?? persistenceError;
  if (!message || dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-amber-950/80 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex-shrink-0">
      <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 transition-colors"
        aria-label="Dismiss warning"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AssetProvider>
        <div className="flex w-full h-screen bg-[#161616] text-zinc-200 overflow-hidden font-sans antialiased selection:bg-blue-500/30 selection:text-blue-100">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 bg-[#1c1c1e] outline-none" tabIndex={0}>
            <Toolbar />
            <StorageWarningBanner />
            <AssetGrid />
          </div>
          <Inspector />
          <ShortcutOverlay />
          <ToastViewport />
        </div>
      </AssetProvider>
    </ErrorBoundary>
  );
}
