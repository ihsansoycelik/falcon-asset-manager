import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Asset, AssetType, Orientation, SmartFolder, SmartFolderRule, SortBy, SortOrder, ViewMode } from '../types';
import { assetMatchesColorBucket } from '../lib/utils';

interface AssetContextType {
  assets: Asset[];
  persistenceError: string | null;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  selectedAssetIds: Set<string>;
  toggleSelection: (id: string, multiMode?: boolean) => void;
  selectRange: (id: string) => void;
  selectAssets: (ids: string[]) => void;
  selectAllFilteredAssets: () => void;
  selectAdjacentAsset: (direction: 'left' | 'right' | 'up' | 'down', columnCount?: number) => Asset | null;
  clearSelection: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredAssets: Asset[];
  activeFolder: string;
  setActiveFolder: (folder: string) => void;
  folderNames: string[];
  createFolder: (name: string) => void;
  renameFolder: (oldName: string, newName: string) => void;
  deleteFolder: (name: string) => void;
  assignAssetsToFolder: (ids: string[], folder: string | null) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  deleteAssets: (ids: string[]) => void;
  restoreAssets: (ids: string[]) => void;
  deleteAssetsPermanently: (ids: string[]) => void;
  emptyTrash: () => void;
  toggleStarred: (id: string) => void;
  renameAsset: (id: string, name: string) => void;
  batchRenameAssets: (ids: string[], pattern: string) => void;
  addAssetTag: (id: string, tag: string) => void;
  removeAssetTag: (id: string, tag: string) => void;
  setAssetRating: (id: string, rating: number) => void;
  setSelectionRating: (rating: number) => void;
  setAssetLabel: (id: string, label: string | null) => void;
  labelFilter: string | null;
  setLabelFilter: (label: string | null) => void;
  setAssetNote: (id: string, note: string) => void;
  setAssetAnnotation: (id: string, dataUrl: string | undefined) => void;
  undoLastDelete: () => void;
  addFiles: (files: File[] | FileList) => Promise<void>;
  addFileFromUrl: (url: string) => Promise<void>;
  isLoadingUrl: boolean;
  isImporting: boolean;
  showToast: (message: string) => void;
  storageWarning: string | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  thumbSize: number;
  setThumbSize: (size: number) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  typeFilters: Set<Asset['type']>;
  toggleTypeFilter: (type: Asset['type']) => void;
  tagFilters: Set<string>;
  toggleTagFilter: (tag: string) => void;
  colorFilter: string | null;
  setColorFilter: (color: string | null) => void;
  orientationFilter: Orientation;
  setOrientationFilter: (orientation: Orientation) => void;
  minRating: number;
  setMinRating: (rating: number) => void;
  activeFilterCount: number;
  clearAdvancedFilters: () => void;
  // Smart folders
  smartFolders: SmartFolder[];
  createSmartFolder: (name: string, rules: SmartFolderRule[], matchAll: boolean) => void;
  updateSmartFolder: (id: string, name: string, rules: SmartFolderRule[], matchAll: boolean) => void;
  deleteSmartFolder: (id: string) => void;
  // Random explore
  selectRandomAsset: () => void;
  // Library export/import
  exportLibrary: () => Promise<void>;
  importLibrary: (file: File) => Promise<void>;
}

export type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  action?: () => void;
};

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(loadPersistedAssets);
  const assetsRef = useRef<Asset[]>(assets);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolderState] = useState('All');
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<string[][]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [thumbSize, setThumbSize] = useState<number>(loadPersistedThumbSize);
  const [sortBy, setSortBy] = useState<SortBy>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [typeFilters, setTypeFilters] = useState<Set<Asset['type']>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [orientationFilter, setOrientationFilter] = useState<Orientation>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [folders, setFolders] = useState<string[]>(loadPersistedFolders);
  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>(loadPersistedSmartFolders);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => { assetsRef.current = assets; }, [assets]);

  // Check IndexedDB availability (fails in Safari private mode)
  useEffect(() => {
    openAssetDb().catch(() => {
      setStorageWarning('IndexedDB is unavailable in this browser or browsing mode. Imported files will not persist between sessions. Try disabling private/incognito mode.');
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('falcon_thumb_size', String(thumbSize));
    } catch { /* non-critical */ }
  }, [thumbSize]);

  // Hydrate IndexedDB blobs on mount
  useEffect(() => {
    let isCancelled = false;
    const generatedUrls: string[] = [];

    const hydrateIndexedDbAssets = async () => {
      const hydratedAssets = await Promise.all(assetsRef.current.map(async asset => {
        if (asset.storage !== 'indexeddb') return asset;
        const blob = await getAssetBlob(asset.id);
        if (!blob) return asset;
        const url = URL.createObjectURL(blob);
        generatedUrls.push(url);
        return { ...asset, url };
      }));

      if (isCancelled) { generatedUrls.forEach(revokeObjectUrl); return; }

      setAssets(current => {
        const appliedUrls = new Set<string>();
        const nextAssets = current.map(asset => {
          const hydrated = hydratedAssets.find(c => c.id === asset.id);
          if (!hydrated || hydrated.url === asset.url) return asset;
          revokeObjectUrl(asset.url);
          appliedUrls.add(hydrated.url);
          return hydrated;
        });
        generatedUrls.filter(u => !appliedUrls.has(u)).forEach(revokeObjectUrl);
        return nextAssets;
      });
    };

    void hydrateIndexedDbAssets();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => () => { assetsRef.current.forEach(a => revokeObjectUrl(a.url)); }, []);

  // Persist assets.
  // Known limitation: two tabs open simultaneously can overwrite each other's
  // localStorage writes. For a single-user local app this is acceptable;
  // adding a BroadcastChannel sync would be the fix if multi-tab matters.
  useEffect(() => {
    const persist = () => {
      try {
        localStorage.setItem('falcon_assets', JSON.stringify(assets.map(a => ({
          ...a,
          url: a.storage === 'indexeddb' ? '' : a.url,
        }))));
        setPersistenceError(null);
      } catch (error) {
        setPersistenceError(getStorageErrorMessage(error));
      }
    };
    const id = window.setTimeout(persist, 150);
    window.addEventListener('beforeunload', persist);
    return () => { window.clearTimeout(id); window.removeEventListener('beforeunload', persist); };
  }, [assets]);

  // Persist folders
  useEffect(() => {
    const persist = () => {
      try { localStorage.setItem('falcon_folders', JSON.stringify(folders)); } catch { /* ignore */ }
    };
    const id = window.setTimeout(persist, 150);
    window.addEventListener('beforeunload', persist);
    return () => { window.clearTimeout(id); window.removeEventListener('beforeunload', persist); };
  }, [folders]);

  // Persist smart folders
  useEffect(() => {
    try { localStorage.setItem('falcon_smart_folders', JSON.stringify(smartFolders)); } catch { /* ignore */ }
  }, [smartFolders]);

  const folderNames = useMemo(() => {
    return Array.from(new Set([
      ...folders,
      ...assets.map(a => a.folder).filter((f): f is string => Boolean(f)),
    ])).sort((a, b) => a.localeCompare(b));
  }, [assets, folders]);

  const setActiveFolder = (folder: string) => {
    if (folder === activeFolder) return;
    setBackStack(prev => [...prev, activeFolder]);
    setForwardStack([]);
    setActiveFolderState(folder);
    clearSelection();
  };

  const toggleSelection = (id: string, multiMode = false) => {
    setSelectedAssetIds(prev => {
      const next = new Set(multiMode ? prev : []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const selectAssets = (ids: string[]) => {
    setSelectedAssetIds(new Set(ids));
    setLastSelectedId(ids.at(-1) ?? null);
  };

  const clearSelection = () => {
    setSelectedAssetIds(new Set());
    setLastSelectedId(null);
  };

  const pushToast = (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
    window.setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  };

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const deleteAssets = (ids: string[]) => {
    const now = new Date().toISOString();
    const idsToDelete = ids.filter(id => assets.some(a => a.id === id && !a.deleted));
    if (idsToDelete.length > 0) setUndoStack(prev => [...prev, idsToDelete]);
    setAssets(prev => prev.map(a => ids.includes(a.id) ? { ...a, deleted: true, dateModified: now } : a));
    clearSelection();
    if (idsToDelete.length > 0) {
      pushToast({
        message: `Deleted ${idsToDelete.length} ${idsToDelete.length === 1 ? 'asset' : 'assets'}`,
        actionLabel: 'Undo',
        action: undoLastDelete,
      });
    }
  };

  const restoreAssets = (ids: string[]) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => ids.includes(a.id) ? { ...a, deleted: false, dateModified: now } : a));
    clearSelection();
    pushToast({ message: `Restored ${ids.length} ${ids.length === 1 ? 'asset' : 'assets'}` });
  };

  const deleteAssetsPermanently = (ids: string[]) => {
    ids.forEach(id => void deleteAssetBlob(id));
    setAssets(prev => {
      const removed = prev.filter(a => ids.includes(a.id));
      removed.forEach(a => revokeObjectUrl(a.url));
      return prev.filter(a => !ids.includes(a.id));
    });
    clearSelection();
    pushToast({ message: `Permanently deleted ${ids.length} ${ids.length === 1 ? 'asset' : 'assets'}` });
  };

  const emptyTrash = () => {
    assets.filter(a => a.deleted).forEach(a => void deleteAssetBlob(a.id));
    setAssets(prev => {
      const removed = prev.filter(a => a.deleted);
      removed.forEach(a => revokeObjectUrl(a.url));
      return prev.filter(a => !a.deleted);
    });
    clearSelection();
    pushToast({ message: 'Trash emptied' });
  };

  const toggleStarred = (id: string) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, starred: !a.starred, dateModified: now } : a));
  };

  const renameAsset = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, name: trimmed, dateModified: now } : a));
  };

  const batchRenameAssets = (ids: string[], pattern: string) => {
    const now = new Date().toISOString();
    const trimmed = pattern.trim();
    if (!trimmed || ids.length === 0) return;

    setAssets(prev => prev.map(a => {
      const idx = ids.indexOf(a.id);
      if (idx === -1) return a;
      const ext = a.name.includes('.') ? `.${a.name.split('.').pop()}` : '';
      const baseName = a.name.replace(/\.[^.]+$/, '');
      const newName = trimmed
        .replace(/\{name\}/g, baseName)
        .replace(/\{index\}/g, String(idx + 1).padStart(2, '0'))
        .replace(/\{date\}/g, now.slice(0, 10))
        + ext;
      return { ...a, name: newName, dateModified: now };
    }));
    pushToast({ message: `Renamed ${ids.length} assets` });
  };

  const addAssetTag = (id: string, tag: string) => {
    const normalizedTag = tag.trim().replace(/^#/, '').toLowerCase();
    if (!normalizedTag) return;
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => {
      if (a.id !== id || a.tags.includes(normalizedTag)) return a;
      return { ...a, tags: [...a.tags, normalizedTag], dateModified: now };
    }));
    pushToast({ message: `Added #${normalizedTag}` });
  };

  const removeAssetTag = (id: string, tag: string) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id !== id ? a : { ...a, tags: a.tags.filter(t => t !== tag), dateModified: now }));
    pushToast({ message: `Removed #${tag}` });
  };

  const setAssetRating = (id: string, rating: number) => {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, rating: clamped, dateModified: now } : a));
  };

  const setAssetLabel = (id: string, label: string | null) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, label: label ?? undefined, dateModified: now } : a));
  };

  const setSelectionRating = (rating: number) => {
    const clamped = Math.max(0, Math.min(5, Math.round(rating)));
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => ids.includes(a.id) ? { ...a, rating: clamped, dateModified: now } : a));
  };

  const setAssetNote = (id: string, note: string) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, note, dateModified: now } : a));
  };

  const setAssetAnnotation = (id: string, dataUrl: string | undefined) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, annotationDataUrl: dataUrl, dateModified: now } : a));
  };

  const createFolder = (name: string) => {
    // Strip leading/trailing slashes and whitespace; reject empty segments
    const trimmed = name.trim().replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
    if (!trimmed || trimmed.endsWith('/') || trimmed.split('/').some(s => !s.trim())) return;
    setFolders(prev => prev.includes(trimmed) ? prev : [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    pushToast({ message: `Created folder "${trimmed}"` });
  };

  const renameFolder = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setFolders(prev => Array.from(new Set(prev.map(f => f === oldName ? trimmed : f))).sort((a, b) => a.localeCompare(b)));
    setAssets(prev => prev.map(a => a.folder === oldName ? { ...a, folder: trimmed, dateModified: new Date().toISOString() } : a));
    if (activeFolder === createFolderId(oldName)) setActiveFolderState(createFolderId(trimmed));
    pushToast({ message: `Renamed folder to "${trimmed}"` });
  };

  const deleteFolder = (name: string) => {
    setFolders(prev => prev.filter(f => f !== name));
    setAssets(prev => prev.map(a => a.folder === name ? { ...a, folder: undefined, dateModified: new Date().toISOString() } : a));
    if (activeFolder === createFolderId(name)) {
      setActiveFolderState('All');
      setActiveTag(null);
      clearSelection();
    }
    pushToast({ message: `Deleted folder "${name}"` });
  };

  const assignAssetsToFolder = (ids: string[], folder: string | null) => {
    const normalizedFolder = folder?.trim() || undefined;
    if (normalizedFolder) createFolder(normalizedFolder);
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => ids.includes(a.id) ? { ...a, folder: normalizedFolder, dateModified: now } : a));
    pushToast({
      message: normalizedFolder
        ? `Moved ${ids.length} ${ids.length === 1 ? 'asset' : 'assets'} to "${normalizedFolder}"`
        : `Removed ${ids.length} ${ids.length === 1 ? 'asset' : 'assets'} from folder`,
    });
  };

  const undoLastDelete = () => {
    setUndoStack(prev => {
      const ids = prev.at(-1);
      if (!ids) return prev;
      const now = new Date().toISOString();
      const restored = assets
        .filter(a => ids.includes(a.id))
        .map(a => ({ ...a, deleted: false, dateModified: now }))
        .filter(a => assetMatchesCurrentView(a))
        .map(a => a.id);
      setAssets(current => current.map(a => ids.includes(a.id) ? { ...a, deleted: false, dateModified: now } : a));
      setSelectedAssetIds(new Set(restored));
      setLastSelectedId(restored.at(-1) ?? null);
      pushToast({ message: `Restored ${ids.length} ${ids.length === 1 ? 'asset' : 'assets'}` });
      return prev.slice(0, -1);
    });
  };

  const addFiles = async (files: File[] | FileList) => {
    const supportedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm',
      'mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a',
      'pdf',
      'ttf', 'otf', 'woff', 'woff2']);

    const supportedFiles = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      return file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/') ||
        file.type === 'application/pdf' ||
        file.type.startsWith('font/') ||
        supportedExtensions.has(ext);
    });

    if (supportedFiles.length === 0) return;

    // Duplicate detection: check fingerprints
    const existingFingerprints = new Set(assetsRef.current.filter(a => a.fingerprint && !a.deleted).map(a => a.fingerprint!));
    const duplicates: string[] = [];
    const uniqueFiles: File[] = [];

    for (const file of supportedFiles) {
      const fp = await computeFileFingerprint(file);
      if (existingFingerprints.has(fp)) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.push(file);
        existingFingerprints.add(fp); // prevent duplicates within the current batch
      }
    }

    if (duplicates.length > 0) {
      pushToast({ message: `Skipped ${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}: ${duplicates.slice(0, 2).join(', ')}${duplicates.length > 2 ? '…' : ''}` });
    }

    if (uniqueFiles.length === 0) return;

    const activeCustomFolder = getCustomFolderName(activeFolder);
    setIsImporting(true);
    const failed: string[] = [];
    const importedAssets: Asset[] = [];

    for (const file of uniqueFiles) {
      try {
        const asset = await fileToAsset(file, activeCustomFolder);
        importedAssets.push(asset);
      } catch (err) {
        const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
        if (isQuota) {
          setStorageWarning('Storage quota exceeded. Some files were not imported. Free up browser storage to continue.');
          failed.push(file.name);
          break; // stop processing more files once storage is full
        }
        failed.push(file.name);
        console.error('Failed to import:', file.name, err);
      }
    }

    setIsImporting(false);

    if (importedAssets.length > 0) {
      setAssets(prev => [...importedAssets, ...prev]);
      setSelectedAssetIds(new Set(importedAssets.map(a => a.id)));
      setLastSelectedId(importedAssets[0].id);
      pushToast({ message: `Imported ${importedAssets.length} ${importedAssets.length === 1 ? 'asset' : 'assets'}${failed.length > 0 ? ` (${failed.length} failed)` : ''}` });
    }

    if (failed.length > 0 && importedAssets.length === 0) {
      pushToast({ message: `Failed to import ${failed.length} ${failed.length === 1 ? 'file' : 'files'}` });
    }
  };

  const addFileFromUrl = async (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;
    setIsLoadingUrl(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      // Derive filename from URL or Content-Disposition
      let fileName = url.split('/').pop()?.split('?')[0] || 'download';
      const cd = response.headers.get('content-disposition');
      const cdMatch = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)/i);
      if (cdMatch?.[1]) fileName = decodeURIComponent(cdMatch[1].trim());
      if (!fileName.includes('.') && blob.type) {
        const ext = blob.type.split('/')[1]?.split(';')[0] || 'png';
        fileName += `.${ext}`;
      }

      const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream', lastModified: Date.now() });
      await addFiles([file]);
    } catch (e) {
      pushToast({ message: `Failed to import URL: ${(e as Error).message}` });
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const goBack = () => {
    setBackStack(prev => {
      const previousFolder = prev.at(-1);
      if (!previousFolder) return prev;
      setForwardStack(f => [activeFolder, ...f]);
      setActiveFolderState(previousFolder);
      clearSelection();
      return prev.slice(0, -1);
    });
  };

  const goForward = () => {
    setForwardStack(prev => {
      const nextFolder = prev[0];
      if (!nextFolder) return prev;
      setBackStack(b => [...b, activeFolder]);
      setActiveFolderState(nextFolder);
      clearSelection();
      return prev.slice(1);
    });
  };

  // Smart folder CRUD
  const createSmartFolder = (name: string, rules: SmartFolderRule[], matchAll: boolean) => {
    const id = `sf_${crypto.randomUUID()}`;
    setSmartFolders(prev => [...prev, { id, name, rules, matchAll }]);
    pushToast({ message: `Created smart folder "${name}"` });
  };

  const updateSmartFolder = (id: string, name: string, rules: SmartFolderRule[], matchAll: boolean) => {
    setSmartFolders(prev => prev.map(sf => sf.id === id ? { ...sf, name, rules, matchAll } : sf));
  };

  const deleteSmartFolder = (id: string) => {
    const sf = smartFolders.find(s => s.id === id);
    setSmartFolders(prev => prev.filter(s => s.id !== id));
    if (activeFolder === id) setActiveFolderState('All');
    if (sf) pushToast({ message: `Deleted smart folder "${sf.name}"` });
  };

  const showToast = (message: string) => pushToast({ message });

  const selectRandomAsset = () => {
    const visible = assets.filter(a => !a.deleted);
    if (visible.length === 0) return;
    const pick = visible[Math.floor(Math.random() * visible.length)];
    selectAssets([pick.id]);
    // Scroll into view is handled by the grid's asset ref system
  };

  const exportLibrary = async () => {
    const visibleAssets = assets.filter(a => !a.deleted);
    const totalSizeBytes = visibleAssets.reduce((sum, a) => sum + a.size, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    // Warn for large exports (>200 MB) — JSON.stringify on huge base64 payloads can OOM the tab
    if (totalSizeMB > 200) {
      pushToast({ message: `Exporting ${Math.round(totalSizeMB)} MB — this may take a moment and use significant memory.` });
    } else {
      pushToast({ message: 'Preparing export…' });
    }

    try {
      const exportedAssets = await Promise.all(
        visibleAssets.map(async a => {
          if (a.storage === 'indexeddb') {
            try {
              const blob = await getAssetBlob(a.id);
              if (blob) return { ...a, _exportedDataUrl: await blobToDataUrl(blob) };
            } catch { /* blob unavailable — export metadata only */ }
          }
          return a;
        })
      );
      const payload = { falconVersion: 1, exportedAt: new Date().toISOString(), folders, smartFolders, assets: exportedAssets };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `falcon-library-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      pushToast({ message: `Exported ${exportedAssets.length} ${exportedAssets.length === 1 ? 'asset' : 'assets'}` });
    } catch (e) {
      const msg = (e as Error).message ?? 'unknown error';
      const isMemory = msg.toLowerCase().includes('memory') || msg.toLowerCase().includes('allocation');
      pushToast({ message: isMemory ? 'Export failed: not enough memory. Try exporting fewer assets.' : `Export failed: ${msg}` });
    }
  };

  const importLibrary = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.falconVersion || !Array.isArray(payload.assets)) {
        pushToast({ message: 'Invalid library file format' }); return;
      }
      const now = new Date().toISOString();
      const existingFingerprints = new Set(assetsRef.current.filter(a => a.fingerprint && !a.deleted).map(a => a.fingerprint!));
      const importedAssets: Asset[] = [];
      for (const rawAsset of payload.assets as (Asset & { _exportedDataUrl?: string })[]) {
        if (rawAsset.fingerprint && existingFingerprints.has(rawAsset.fingerprint)) continue;
        if (rawAsset.fingerprint) existingFingerprints.add(rawAsset.fingerprint);
        const id = `${Date.now()}-${crypto.randomUUID()}`;
        let url = rawAsset.url; let storage: Asset['storage'] = rawAsset.storage;
        if (rawAsset._exportedDataUrl) {
          const response = await fetch(rawAsset._exportedDataUrl);
          const blob = await response.blob();
          await saveAssetBlob(id, blob);
          url = URL.createObjectURL(blob); storage = 'indexeddb';
        }
        importedAssets.push({ ...rawAsset, id, url, storage, dateAdded: rawAsset.dateAdded || now });
      }
      if (payload.folders && Array.isArray(payload.folders))
        setFolders(prev => Array.from(new Set([...prev, ...payload.folders])).sort((a, b) => a.localeCompare(b)));
      if (payload.smartFolders && Array.isArray(payload.smartFolders))
        setSmartFolders(prev => [...prev, ...(payload.smartFolders as SmartFolder[]).map(sf => ({ ...sf, id: `sf_${crypto.randomUUID()}` }))]);
      setAssets(prev => [...importedAssets, ...prev]);
      pushToast({ message: `Imported ${importedAssets.length} assets` });
    } catch (e) {
      pushToast({ message: `Import failed: ${(e as Error).message}` });
    }
  };

  // Current view membership check (used by undoLastDelete)
  const assetMatchesCurrentView = (asset: Asset) => {
    const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      asset.name.toLowerCase().includes(q) ||
      asset.tags.some(t => t.toLowerCase().includes(q));
    let matchesFolder = false;

    switch (activeFolder) {
      case 'All': matchesFolder = !asset.deleted; break;
      case 'Recent': matchesFolder = !asset.deleted && new Date(asset.dateAdded).getTime() >= recentThreshold; break;
      case 'Starred': matchesFolder = !asset.deleted && asset.starred; break;
      case 'Images': matchesFolder = !asset.deleted && asset.type === 'image'; break;
      case 'Vectors': matchesFolder = !asset.deleted && asset.type === 'vector'; break;
      case 'Videos': matchesFolder = !asset.deleted && asset.type === 'video'; break;
      case 'Audio': matchesFolder = !asset.deleted && asset.type === 'audio'; break;
      case 'Trash': matchesFolder = asset.deleted; break;
      default:
        if (isCustomFolderId(activeFolder)) {
          matchesFolder = !asset.deleted && asset.folder === getCustomFolderName(activeFolder);
        } else {
          const sf = smartFolders.find(s => s.id === activeFolder);
          if (sf) matchesFolder = !asset.deleted && assetMatchesSmartFolder(asset, sf);
        }
    }

    const matchesTag = activeTag ? asset.tags.includes(activeTag) : true;
    const matchesTypeFilters = typeFilters.size === 0 || typeFilters.has(asset.type);
    const matchesTagFilters = tagFilters.size === 0 || asset.tags.some(t => tagFilters.has(t));

    return matchesSearch && matchesFolder && matchesTag && matchesTypeFilters && matchesTagFilters;
  };

  const filteredAssets = useMemo(() => {
    const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
    const q = searchQuery.trim().toLowerCase();

    return assets.filter(asset => {
      const matchesSearch = !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.tags.some(t => t.toLowerCase().includes(q)) ||
        (asset.note?.toLowerCase().includes(q) ?? false);

      let matchesFolder = false;
      switch (activeFolder) {
        case 'All': matchesFolder = !asset.deleted; break;
        case 'Recent': matchesFolder = !asset.deleted && new Date(asset.dateAdded).getTime() >= recentThreshold; break;
        case 'Starred': matchesFolder = !asset.deleted && asset.starred; break;
        case 'Images': matchesFolder = !asset.deleted && asset.type === 'image'; break;
        case 'Vectors': matchesFolder = !asset.deleted && asset.type === 'vector'; break;
        case 'Videos': matchesFolder = !asset.deleted && asset.type === 'video'; break;
        case 'Audio': matchesFolder = !asset.deleted && asset.type === 'audio'; break;
      case 'PDFs': matchesFolder = !asset.deleted && asset.type === 'pdf'; break;
      case 'Fonts': matchesFolder = !asset.deleted && asset.type === 'font'; break;
        case 'Trash': matchesFolder = asset.deleted; break;
        default:
          if (isCustomFolderId(activeFolder)) {
            const folderPath = getCustomFolderName(activeFolder);
            // Include assets in this folder AND all nested subfolders (path prefix match)
            matchesFolder = !asset.deleted && (
              asset.folder === folderPath ||
              (asset.folder?.startsWith(folderPath + '/') ?? false)
            );
          } else {
            const sf = smartFolders.find(s => s.id === activeFolder);
            if (sf) matchesFolder = !asset.deleted && assetMatchesSmartFolder(asset, sf);
          }
      }

      const matchesTag = activeTag ? asset.tags.includes(activeTag) : true;
      const matchesTypeFilters = typeFilters.size === 0 || typeFilters.has(asset.type);
      const matchesTagFilters = tagFilters.size === 0 || asset.tags.some(t => tagFilters.has(t));
      const matchesColor = !colorFilter || assetMatchesColorBucket(asset.colors, colorFilter);
      const matchesOrientation = matchesOrientationFilter(asset, orientationFilter);
      const matchesRating = minRating === 0 || (asset.rating ?? 0) >= minRating;
      const matchesLabel = !labelFilter || asset.label === labelFilter;

      return matchesSearch && matchesFolder && matchesTag && matchesTypeFilters &&
        matchesTagFilters && matchesColor && matchesOrientation && matchesRating && matchesLabel;
    }).sort((a: Asset, b: Asset) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'dateAdded': cmp = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime(); break;
        case 'size': cmp = a.size - b.size; break;
        case 'dimensions': cmp = getSortableArea(a) - getSortableArea(b); break;
        case 'rating': cmp = (a.rating ?? 0) - (b.rating ?? 0); break;
      }
      return cmp * dir;
    });
  // Performance note: this memo re-runs on every filter/sort change.
  // With 1000+ assets it's measurable but acceptable for a client-only app.
  // If it becomes a bottleneck: debounce the search input and memoize
  // individual filter predicates.
  }, [assets, searchQuery, activeFolder, activeTag, typeFilters, tagFilters, colorFilter, labelFilter, orientationFilter, minRating, sortBy, sortOrder, smartFolders]);

  const activeFilterCount = typeFilters.size + tagFilters.size +
    (colorFilter ? 1 : 0) + (labelFilter ? 1 : 0) + (orientationFilter !== 'all' ? 1 : 0) + (minRating > 0 ? 1 : 0);

  const clearAdvancedFilters = () => {
    setTypeFilters(new Set());
    setTagFilters(new Set());
    setColorFilter(null);
    setLabelFilter(null);
    setOrientationFilter('all');
    setMinRating(0);
    setSortBy('dateAdded');
    setSortOrder('desc');
  };

  const selectRange = (id: string) => {
    if (!lastSelectedId) { selectAssets([id]); return; }
    const startIndex = filteredAssets.findIndex(a => a.id === lastSelectedId);
    const endIndex = filteredAssets.findIndex(a => a.id === id);
    if (startIndex === -1 || endIndex === -1) { selectAssets([id]); return; }
    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    setSelectedAssetIds(new Set(filteredAssets.slice(from, to + 1).map(a => a.id)));
  };

  const selectAllFilteredAssets = () => selectAssets(filteredAssets.map(a => a.id));

  const selectAdjacentAsset = (direction: 'left' | 'right' | 'up' | 'down', columnCount = 1) => {
    if (filteredAssets.length === 0) return null;
    const anchorId = lastSelectedId ?? Array.from(selectedAssetIds).at(-1);
    const currentIndex = anchorId ? filteredAssets.findIndex(a => a.id === anchorId) : -1;
    const offsets = { left: -1, right: 1, up: -columnCount, down: columnCount };
    const nextIndex = Math.min(Math.max((currentIndex === -1 ? 0 : currentIndex) + offsets[direction], 0), filteredAssets.length - 1);
    const nextAsset = filteredAssets[nextIndex];
    selectAssets([nextAsset.id]);
    return nextAsset;
  };

  const toggleTypeFilter = (type: Asset['type']) => setTypeFilters(prev => toggleSetValue(prev, type));
  const toggleTagFilter = (tag: string) => setTagFilters(prev => toggleSetValue(prev, tag));

  return (
    <AssetContext.Provider value={{
      assets, persistenceError, toasts, dismissToast,
      selectedAssetIds, toggleSelection, selectRange, selectAssets, selectAllFilteredAssets, selectAdjacentAsset, clearSelection,
      searchQuery, setSearchQuery, filteredAssets,
      activeFolder, setActiveFolder, folderNames, createFolder, renameFolder, deleteFolder, assignAssetsToFolder,
      canGoBack: backStack.length > 0, canGoForward: forwardStack.length > 0, goBack, goForward,
      activeTag, setActiveTag,
      deleteAssets, restoreAssets, deleteAssetsPermanently, emptyTrash,
      toggleStarred, renameAsset, batchRenameAssets, addAssetTag, removeAssetTag,
      setAssetRating, setSelectionRating, setAssetLabel, labelFilter, setLabelFilter,
      setAssetNote, setAssetAnnotation, undoLastDelete,
      addFiles, addFileFromUrl, isLoadingUrl, isImporting, showToast, storageWarning,
      viewMode, setViewMode, thumbSize, setThumbSize,
      sortBy, setSortBy, sortOrder, setSortOrder,
      typeFilters, toggleTypeFilter, tagFilters, toggleTagFilter,
      colorFilter, setColorFilter, orientationFilter, setOrientationFilter,
      minRating, setMinRating, activeFilterCount, clearAdvancedFilters,
      smartFolders, createSmartFolder, updateSmartFolder, deleteSmartFolder,
      selectRandomAsset,
      exportLibrary, importLibrary,
    }}>
      {children}
    </AssetContext.Provider>
  );
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const toggleSetValue = <T,>(set: Set<T>, value: T) => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
};

const getSortableArea = (asset: Asset) => {
  const area = asset.width * asset.height;
  return area > 0 ? area : Number.NEGATIVE_INFINITY;
};

const matchesOrientationFilter = (asset: Asset, orientation: Orientation): boolean => {
  if (orientation === 'all') return true;
  if (!asset.width || !asset.height) return false;
  const ratio = asset.width / asset.height;
  switch (orientation) {
    case 'landscape': return ratio > 1.05;
    case 'portrait': return ratio < 0.95;
    case 'square': return ratio >= 0.95 && ratio <= 1.05;
    default: return true;
  }
};

const assetMatchesSmartFolder = (asset: Asset, sf: SmartFolder): boolean => {
  if (sf.rules.length === 0) return true;
  const results = sf.rules.map(rule => {
    switch (rule.field) {
      case 'tag': return asset.tags.includes(rule.value.toLowerCase());
      case 'type': return asset.type === rule.value;
      case 'rating': return (asset.rating ?? 0) >= Number(rule.value);
      case 'starred': return rule.value === 'true' ? asset.starred : !asset.starred;
      default: return false;
    }
  });
  return sf.matchAll ? results.every(Boolean) : results.some(Boolean);
};

const DEFAULT_THUMB_SIZE = 190;

const loadPersistedThumbSize = (): number => {
  try {
    const saved = Number(localStorage.getItem('falcon_thumb_size'));
    if (Number.isFinite(saved) && saved >= 120 && saved <= 360) return saved;
  } catch { /* ignore */ }
  return DEFAULT_THUMB_SIZE;
};

const getStorageErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'Local storage is full. Asset metadata may not be saved until space is freed.';
  }
  return 'Asset metadata could not be saved locally.';
};

const loadPersistedAssets = (): Asset[] => {
  try {
    const saved = localStorage.getItem('falcon_assets');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as Asset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(a => ({
      ...a,
      tags: a.tags ?? [],
      colors: a.colors ?? [],
      starred: a.starred ?? false,
      deleted: a.deleted ?? false,
      url: a.storage === 'indexeddb' ? '' : a.url,
    }));
  } catch {
    return [];
  }
};

const loadPersistedFolders = (): string[] => {
  try {
    const saved = localStorage.getItem('falcon_folders');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    // Filter out invalid paths: must be non-empty strings with no empty segments
    return parsed.filter((f): f is string =>
      typeof f === 'string' &&
      f.trim().length > 0 &&
      !f.includes('//') &&
      f.split('/').every(s => s.trim().length > 0)
    );
  } catch {
    return [];
  }
};

const loadPersistedSmartFolders = (): SmartFolder[] => {
  try {
    const saved = localStorage.getItem('falcon_smart_folders');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const computeFileFingerprint = async (file: File): Promise<string> => {
  try {
    const sliceSize = Math.min(65536, file.size);
    const buffer = await file.slice(0, sliceSize).arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex}_${file.size}`;
  } catch {
    return `${file.name}_${file.size}_${file.lastModified}`;
  }
};

const fileToAsset = async (file: File, folder?: string): Promise<Asset> => {
  const id = `${Date.now()}-${crypto.randomUUID()}`;
  const url = URL.createObjectURL(file);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const now = new Date().toISOString();

  try {
    const type = detectAssetType(file, ext);

    if (type === 'audio') {
      const [fingerprint, duration] = await Promise.all([
        computeFileFingerprint(file),
        getAudioDuration(url),
      ]);
      await saveAssetBlob(id, file);
      return {
        id, name: file.name, url, type, width: 0, height: 0, size: file.size,
        tags: [], colors: [], dateAdded: now, dateModified: new Date(file.lastModified).toISOString(),
        starred: false, deleted: false, storage: 'indexeddb', folder, duration, fingerprint,
      };
    }

    if (type === 'pdf') {
      const fingerprint = await computeFileFingerprint(file);
      await saveAssetBlob(id, file);
      return {
        id, name: file.name, url, type, width: 612, height: 792, size: file.size,
        tags: [], colors: [], dateAdded: now, dateModified: new Date(file.lastModified).toISOString(),
        starred: false, deleted: false, storage: 'indexeddb', folder, fingerprint,
      };
    }

    if (type === 'font') {
      const [fingerprint, fontFamily] = await Promise.all([
        computeFileFingerprint(file),
        loadFontFamily(file, url, ext),
      ]);
      await saveAssetBlob(id, file);
      return {
        id, name: file.name, url, type, width: 0, height: 0, size: file.size,
        tags: [], colors: [], dateAdded: now, dateModified: new Date(file.lastModified).toISOString(),
        starred: false, deleted: false, storage: 'indexeddb', folder, fontFamily, fingerprint,
      };
    }

    // image / vector / video
    const [dimensions, colors, fingerprint] = await Promise.all([
      getFileDimensions(file, url, type),
      extractColorPalette(url, type),
      computeFileFingerprint(file),
    ]);
    await saveAssetBlob(id, file);
    return {
      id, name: file.name, url, type, width: dimensions.width, height: dimensions.height,
      size: file.size, tags: [], colors, dateAdded: now,
      dateModified: new Date(file.lastModified).toISOString(),
      starred: false, deleted: false, storage: 'indexeddb', folder, fingerprint,
    };
  } catch (error) {
    revokeObjectUrl(url);
    throw error;
  }
};

const detectAssetType = (file: File, ext: string): AssetType => {
  if (file.type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (file.type.startsWith('font/') || ['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
  if (file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (file.type === 'image/svg+xml' || ext === 'svg') return 'vector';
  return 'image';
};

const getAudioDuration = (url: string): Promise<number> =>
  new Promise(resolve => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
    audio.src = url;
  });

const loadFontFamily = async (file: File, url: string, ext: string): Promise<string> => {
  const formatMap: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
  const format = formatMap[ext] ?? 'truetype';
  const tempName = `FalconFont_${Date.now()}`;
  try {
    const face = new FontFace(tempName, `url(${url}) format('${format}')`);
    await face.load();
    document.fonts.add(face);
    return file.name.replace(/\.[^.]+$/, '');
  } catch {
    return file.name.replace(/\.[^.]+$/, '');
  }
};

const getFileDimensions = (file: File, url: string, type: AssetType): Promise<{ width: number; height: number }> => {
  if (type === 'video') {
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve({ width: video.videoWidth || 0, height: video.videoHeight || 0 });
      video.onerror = () => resolve({ width: 0, height: 0 });
      video.src = url;
    });
  }
  if (type === 'image' || type === 'vector') {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  }
  return Promise.resolve({ width: 0, height: 0 });
};

const extractColorPalette = (url: string, type: AssetType): Promise<string[]> => {
  if (type !== 'image') return Promise.resolve([]);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { resolve([]); return; }
      const maxSide = 80;
      const scale = Math.min(maxSide / img.naturalWidth, maxSide / img.naturalHeight, 1);
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 16) {
          const alpha = data[i + 3];
          if (alpha < 160) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
          const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
          buckets.set(key, bucket);
        }
        const palette = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map(bkt => rgbToHex(Math.round(bkt.r / bkt.count), Math.round(bkt.g / bkt.count), Math.round(bkt.b / bkt.count)));
        resolve(palette);
      } catch { resolve([]); }
    };
    img.onerror = () => resolve([]);
    img.src = url;
  });
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;

const revokeObjectUrl = (url: string) => {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
};

const DB_NAME = 'falcon_asset_manager';
const DB_VERSION = 1;
const BLOB_STORE = 'asset_blobs';

const openAssetDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(BLOB_STORE)) req.result.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const runBlobStoreTransaction = <T,>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  openAssetDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, mode);
    const store = tx.objectStore(BLOB_STORE);
    const req = action(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  }));

const saveAssetBlob = (id: string, blob: Blob): Promise<IDBValidKey> =>
  runBlobStoreTransaction('readwrite', s => s.put(blob, id));

const getAssetBlob = (id: string): Promise<Blob | undefined> =>
  runBlobStoreTransaction('readonly', s => s.get(id));

const deleteAssetBlob = (id: string): Promise<undefined> =>
  runBlobStoreTransaction('readwrite', s => s.delete(id));

export const CUSTOM_FOLDER_PREFIX = 'folder:';
export const createFolderId = (folder: string) => `${CUSTOM_FOLDER_PREFIX}${encodeURIComponent(folder)}`;
const isCustomFolderId = (id: string) => id.startsWith(CUSTOM_FOLDER_PREFIX);
const getCustomFolderName = (id: string) => {
  if (!isCustomFolderId(id)) return undefined;
  return decodeURIComponent(id.slice(CUSTOM_FOLDER_PREFIX.length));
};

export const useStore = () => {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error('useStore must be used within AssetProvider');
  return ctx;
};
