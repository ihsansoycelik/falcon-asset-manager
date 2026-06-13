import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AssetContext';
import { Asset } from '../types';
import { formatBytes, formatDate } from '../lib/utils';
import RatingStars from './RatingStars';
import { downloadAssetFile, exportAssetsAsZip } from '../lib/download';
import {
  Download, ExternalLink, Film, FileQuestion, Search, Star, Trash2, Upload,
  UploadCloud, X, Music, FileText, Type, Pencil, Eraser, Undo2, CheckCircle2,
  ChevronLeft, ChevronRight, Copy, FolderOpen, Tag as LabelIcon,
  Clipboard, ClipboardCheck,
} from 'lucide-react';
import { COLOR_BUCKETS } from '../types';

const listGridColumns = 'grid-cols-[44px_minmax(0,1.5fr)_minmax(0,0.5fr)_minmax(0,0.45fr)_minmax(0,0.55fr)_minmax(0,0.45fr)_minmax(0,0.55fr)]';

type CardCallbacks = {
  onClick: (event: React.MouseEvent, id: string) => void;
  onDoubleClick: (asset: Asset) => void;
  onContextMenu: (event: React.MouseEvent, asset: Asset) => void;
  onDragStart: (event: React.DragEvent, id: string) => void;
  onDrag: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleStar: (id: string) => void;
  onSetRating: (id: string, rating: number) => void;
  registerRef: (id: string) => (node: HTMLDivElement | null) => void;
};

function renderPreview(asset: Asset, size: 'thumb' | 'large' = 'thumb') {
  if (!asset.url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800/40 animate-pulse">
        <div className="w-6 h-6 rounded-full bg-zinc-700" />
      </div>
    );
  }
  if (asset.type === 'image' || asset.type === 'vector') {
    // SVGs are rendered via <img>, not innerHTML, so any embedded <script> tags
    // are inert — no XSS risk. Animations in SVGs will still play.
    return <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />;
  }
  if (asset.type === 'video') {
    return <video src={asset.url} className="w-full h-full object-cover bg-black" muted playsInline preload="metadata" />;
  }
  if (asset.type === 'audio') {
    if (size === 'large') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-6 w-full">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Music size={36} className="text-emerald-400" />
          </div>
          <audio src={asset.url} controls className="w-full max-w-sm" />
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-emerald-900/10">
        <Music size={28} className="text-emerald-400/60" />
      </div>
    );
  }
  if (asset.type === 'pdf') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/10 gap-1">
        <FileText size={size === 'large' ? 48 : 28} className="text-red-400/70" />
        <span className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider">PDF</span>
      </div>
    );
  }
  if (asset.type === 'font') {
    const style = asset.fontFamily ? { fontFamily: `'${asset.fontFamily}', sans-serif` } : {};
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-violet-900/10 gap-1">
        <span style={style} className={`font-bold text-violet-200 ${size === 'large' ? 'text-6xl' : 'text-4xl'}`}>Aa</span>
        {size === 'large' && asset.fontFamily && (
          <span className="text-xs text-violet-400/70 mt-2">{asset.fontFamily}</span>
        )}
      </div>
    );
  }
  return null;
}

type AssetCardProps = {
  asset: Asset;
  isSelected: boolean;
  thumbSize: number;
  cb: CardCallbacks;
  naturalRatio?: boolean;
};

const AssetCard = React.memo(function AssetCard({ asset, isSelected, thumbSize, cb, naturalRatio }: AssetCardProps) {
  const rating = asset.rating ?? 0;
  const aspectStyle = naturalRatio && asset.width && asset.height
    ? { aspectRatio: `${asset.width}/${asset.height}` }
    : undefined;

  return (
    <div
      ref={cb.registerRef(asset.id)}
      draggable
      onClick={(e) => cb.onClick(e, asset.id)}
      onDoubleClick={() => cb.onDoubleClick(asset)}
      onContextMenu={(e) => cb.onContextMenu(e, asset)}
      onDragStart={(e) => cb.onDragStart(e, asset.id)}
      onDrag={cb.onDrag}
      onDragEnd={cb.onDragEnd}
      className="asset-card group cursor-default select-none outline-none"
      style={!naturalRatio ? { containIntrinsicSize: `${Math.round(thumbSize * 0.75) + 48}px ${thumbSize}px` } : undefined}
    >
      <div
        className={`
          ${naturalRatio ? '' : 'aspect-[4/3]'} checker-bg-dark rounded-xl mb-2.5 overflow-hidden relative flex items-center justify-center border transition-[box-shadow,border-color] duration-100
          ${isSelected
            ? 'border-blue-500/70 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
            : 'border-zinc-700/60 group-hover:border-zinc-600 group-hover:shadow-lg group-hover:shadow-black/30'
          }
        `}
        style={aspectStyle ?? { minHeight: naturalRatio ? 80 : undefined }}
      >
        {renderPreview(asset)}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-100" />

        {/* Star button */}
        <button
          onClick={(e) => { e.stopPropagation(); cb.onToggleStar(asset.id); }}
          className={`absolute top-2 right-2 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-opacity duration-100 hover:bg-black/75 ${
            asset.starred || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-label={asset.starred ? 'Remove from starred' : 'Add to starred'}
        >
          <Star size={14} className={asset.starred ? 'text-amber-400 fill-amber-400' : 'text-zinc-300'} strokeWidth={2.2} />
        </button>

        {/* Rating */}
        <div className={`absolute bottom-2 left-2 transition-opacity duration-100 ${rating > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <RatingStars value={rating} size={12} onChange={(r) => cb.onSetRating(asset.id, r)} />
        </div>

        {/* Annotation indicator */}
        {asset.annotationDataUrl && (
          <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-amber-500/80 backdrop-blur-sm flex items-center justify-center pointer-events-none" title="Has annotations">
            <Pencil size={10} className="text-white" />
          </div>
        )}

        {/* Type badge for non-images */}
        {asset.type !== 'image' && (
          <div className={`absolute top-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
            asset.type === 'video' ? 'bg-rose-500/75 text-white' :
            asset.type === 'audio' ? 'bg-emerald-500/75 text-white' :
            asset.type === 'pdf' ? 'bg-red-500/75 text-white' :
            asset.type === 'font' ? 'bg-violet-500/75 text-white' :
            'bg-indigo-500/75 text-white'
          }`}>
            {asset.type === 'video' && <Film size={10} />}
            {asset.type === 'audio' && <Music size={10} />}
            {asset.type === 'pdf' && <FileText size={10} />}
            {asset.type === 'font' && <Type size={10} />}
            {asset.type === 'vector' && <FileQuestion size={10} />}
            {asset.type}
          </div>
        )}

        {/* Color label stripe */}
        {asset.label && (() => {
          const bucket = COLOR_BUCKETS.find(b => b.name === asset.label);
          return bucket ? (
            <div
              className="absolute bottom-0 inset-x-0 h-1.5 pointer-events-none"
              style={{ backgroundColor: bucket.hex }}
              title={`Label: ${bucket.name}`}
            />
          ) : null;
        })()}

        {/* Color swatches */}
        {asset.colors && asset.colors.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            {asset.colors.slice(0, 5).map(color => (
              <div key={color} className="w-4 h-4 rounded-full border border-black/30 shadow-sm flex-shrink-0" style={{ backgroundColor: color }} title={color} />
            ))}
          </div>
        )}
      </div>

      <div className="px-0.5 text-left">
        <div className={`text-[12px] font-medium truncate leading-snug ${isSelected ? 'text-blue-400' : 'text-zinc-200'}`}>
          {asset.name}
        </div>
        <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
          {asset.width && asset.height ? `${asset.width} × ${asset.height} · ` : ''}{formatBytes(asset.size)}
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.asset === next.asset &&
  prev.isSelected === next.isSelected &&
  prev.thumbSize === next.thumbSize &&
  prev.cb === next.cb &&
  prev.naturalRatio === next.naturalRatio
);

export default function AssetGrid() {
  const {
    filteredAssets,
    selectedAssetIds,
    toggleSelection,
    selectRange,
    selectAssets,
    selectAllFilteredAssets,
    selectAdjacentAsset,
    clearSelection,
    deleteAssets,
    undoLastDelete,
    toggleStarred,
    setAssetRating,
    setSelectionRating,
    setAssetAnnotation,
    addFiles,
    viewMode,
    thumbSize,
    activeFolder,
    searchQuery,
    assets,
    typeFilters,
    tagFilters,
    colorFilter,
    minRating,
    orientationFilter,
    activeTag,
    renameAsset,
    assignAssetsToFolder,
    folderNames,
    setAssetLabel,
  } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; asset: Asset; section: 'main' | 'move' | 'label';
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ x: number; y: number; asset: Asset; value: string } | null>(null);
  const [dragOverlay, setDragOverlay] = useState<{ x: number; y: number; count: number } | null>(null);
  const [quickLookAsset, setQuickLookAsset] = useState<Asset | null>(null);
  const [quickLookScale, setQuickLookScale] = useState(1);
  const [quickLookCopied, setQuickLookCopied] = useState(false);
  const [gridColumnCount, setGridColumnCount] = useState(1);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Rubber band selection
  const [rubberBand, setRubberBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const rubberBandStateRef = useRef<{ active: boolean; startX: number; startY: number }>({ active: false, startX: 0, startY: 0 });

  // Annotation
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationColor, setAnnotationColor] = useState('#ff3b30');
  const [annotationSize, setAnnotationSize] = useState(4);
  const [isErasing, setIsErasing] = useState(false);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationHistoryRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const assetRefs = useRef(new Map<string, HTMLDivElement>());

  // Stable refs for rubber band handlers (avoid stale closures)
  const selectAssetsRef = useRef(selectAssets);
  const clearSelectionRef = useRef(clearSelection);
  useEffect(() => { selectAssetsRef.current = selectAssets; }, [selectAssets]);
  useEffect(() => { clearSelectionRef.current = clearSelection; }, [clearSelection]);

  const hasDraggedFiles = (dataTransfer: DataTransfer) => Array.from(dataTransfer.types).includes('Files');

  const registerAssetNode = useCallback((assetId: string) => (node: HTMLDivElement | null) => {
    if (node) assetRefs.current.set(assetId, node);
    else assetRefs.current.delete(assetId);
  }, []);

  const scrollAssetIntoView = (assetId: string) => {
    window.requestAnimationFrame(() => {
      assetRefs.current.get(assetId)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
  };

  useEffect(() => {
    if (viewMode !== 'grid') {
      setGridColumnCount(viewMode === 'list' ? 1 : Math.max(1, Math.floor((gridRef.current?.clientWidth ?? 800) / (thumbSize + 20))));
      return;
    }
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => setGridColumnCount(Math.max(1, window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length));
    update();
    const obs = new ResizeObserver(update);
    obs.observe(grid);
    return () => obs.disconnect();
  }, [filteredAssets.length, viewMode, thumbSize]);

  const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.closest('.asset-card')) return; // clicked on a card — let card handle it
    // Mark start position but don't activate rubber band until mouse moves > 5px
    // This prevents scroll interference on trackpads
    rubberBandStateRef.current = { active: false, startX: e.clientX, startY: e.clientY };
    clearSelectionRef.current();
    e.preventDefault();
  }, []);

  useEffect(() => {
    const animFrameRef = { id: 0 };

    const onMouseMove = (e: MouseEvent) => {
      const rb = rubberBandStateRef.current;
      // Activate rubber band only after 5px movement to avoid trapping trackpad scrolls
      if (!rb.active) {
        const dx = e.clientX - rb.startX;
        const dy = e.clientY - rb.startY;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return;
        rubberBandStateRef.current = { ...rb, active: true };
      }
      const x1 = Math.min(rb.startX, e.clientX);
      const y1 = Math.min(rb.startY, e.clientY);
      const x2 = Math.max(rb.startX, e.clientX);
      const y2 = Math.max(rb.startY, e.clientY);
      setRubberBand({ x1, y1, x2, y2 });

      // Hit-test cards using viewport coords — throttle to rAF
      cancelAnimationFrame(animFrameRef.id);
      animFrameRef.id = requestAnimationFrame(() => {
        const ids: string[] = [];
        assetRefs.current.forEach((node, id) => {
          const r = node.getBoundingClientRect();
          if (r.right >= x1 && r.left <= x2 && r.bottom >= y1 && r.top <= y2) ids.push(id);
        });
        selectAssetsRef.current(ids);
      });
    };

    const onMouseUp = () => {
      if (!rubberBandStateRef.current.active) return;
      rubberBandStateRef.current.active = false;
      cancelAnimationFrame(animFrameRef.id);
      setRubberBand(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animFrameRef.id);
    };
  }, []);

  // Stop rubber band if grid scrolls
  useEffect(() => {
    const stop = () => {
      if (rubberBandStateRef.current.active) {
        rubberBandStateRef.current.active = false;
        setRubberBand(null);
      }
    };
    const el = gridRef.current;
    el?.addEventListener('scroll', stop);
    return () => el?.removeEventListener('scroll', stop);
  }, []);

  useEffect(() => {
    if (!isAnnotating || !quickLookAsset) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const img = canvas.parentElement?.querySelector('img') as HTMLImageElement | null;
    if (img) {
      canvas.width = img.naturalWidth || img.offsetWidth || 800;
      canvas.height = img.naturalHeight || img.offsetHeight || 600;
      if (quickLookAsset.annotationDataUrl) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const annotImg = new Image();
          annotImg.onload = () => ctx.drawImage(annotImg, 0, 0, canvas.width, canvas.height);
          annotImg.src = quickLookAsset.annotationDataUrl;
        }
      }
    }
  }, [isAnnotating, quickLookAsset]);

  const handlersRef = useRef<CardCallbacks>(null as unknown as CardCallbacks);

  const handleAssetClick = (event: React.MouseEvent, assetId: string) => {
    event.stopPropagation();
    if (event.shiftKey) { selectRange(assetId); return; }
    toggleSelection(assetId, event.metaKey || event.ctrlKey);
  };

  const openAssetPreview = (asset: Asset) => {
    setQuickLookAsset(asset);
    setQuickLookScale(1);
    setIsAnnotating(false);
    annotationHistoryRef.current = [];
  };

  const openContextMenu = (event: React.MouseEvent, asset: Asset) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedAssetIds.has(asset.id)) selectAssets([asset.id]);
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 220)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 380)),
      asset,
      section: 'main',
    });
  };

  const getDraggedAssetIds = (assetId: string) => selectedAssetIds.has(assetId) ? Array.from(selectedAssetIds) : [assetId];

  const startAssetDrag = (event: React.DragEvent, assetId: string) => {
    const draggedIds = getDraggedAssetIds(assetId);
    if (!selectedAssetIds.has(assetId)) selectAssets([assetId]);
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-falcon-asset-ids', JSON.stringify(draggedIds));
    event.dataTransfer.setData('text/plain', draggedIds.join(','));
    setDragOverlay({ x: event.clientX, y: event.clientY, count: draggedIds.length });
  };

  const moveAssetDrag = (event: React.DragEvent) => setDragOverlay(cur => cur ? { ...cur, x: event.clientX, y: event.clientY } : cur);
  const endAssetDrag = () => setDragOverlay(null);

  handlersRef.current = {
    onClick: handleAssetClick,
    onDoubleClick: openAssetPreview,
    onContextMenu: openContextMenu,
    onDragStart: startAssetDrag,
    onDrag: moveAssetDrag,
    onDragEnd: endAssetDrag,
    onToggleStar: toggleStarred,
    onSetRating: setAssetRating,
    registerRef: registerAssetNode,
  };

  const stableCb = useRef<CardCallbacks>({
    onClick: (e, id) => handlersRef.current.onClick(e, id),
    onDoubleClick: (a) => handlersRef.current.onDoubleClick(a),
    onContextMenu: (e, a) => handlersRef.current.onContextMenu(e, a),
    onDragStart: (e, id) => handlersRef.current.onDragStart(e, id),
    onDrag: (e) => handlersRef.current.onDrag(e),
    onDragEnd: () => handlersRef.current.onDragEnd(),
    onToggleStar: (id) => handlersRef.current.onToggleStar(id),
    onSetRating: (id, r) => handlersRef.current.onSetRating(id, r),
    registerRef: (id) => handlersRef.current.registerRef(id),
  }).current;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      const isCommand = event.metaKey || event.ctrlKey;
      if (isTyping) return;

      if (event.code === 'Space' && !isCommand) {
        event.preventDefault();
        if (quickLookAsset) { setQuickLookAsset(null); return; }
        const selectedAsset = filteredAssets.find(a => selectedAssetIds.has(a.id));
        if (selectedAsset) openAssetPreview(selectedAsset);
      }

      if (isCommand && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAllFilteredAssets(); }
      if (isCommand && event.key.toLowerCase() === 'z') { event.preventDefault(); undoLastDelete(); }

      if (isCommand && event.key.toLowerCase() === 'c' && selectedAssetIds.size > 0) {
        event.preventDefault();
        const selected = filteredAssets.filter(a => selectedAssetIds.has(a.id));
        if (selected.length === 1) {
          const asset = selected[0];
          if (asset.type === 'image' || asset.type === 'vector') {
            void copyAssetImage(asset);
          } else {
            void copyToClipboard(asset.name, 'Name copied');
          }
        } else {
          void exportAssetsAsZip(selected);
        }
      }

      if (!isCommand && /^[0-5]$/.test(event.key) && selectedAssetIds.size > 0) {
        event.preventDefault();
        setSelectionRating(Number(event.key));
      }

      if (event.key === 'Escape') {
        if (quickLookAsset) { setQuickLookAsset(null); return; }
        if (renameDialog) { setRenameDialog(null); return; }
        clearSelection();
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedAssetIds.size > 0) {
        event.preventDefault();
        deleteAssets(Array.from(selectedAssetIds));
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const direction = event.key.replace('Arrow', '').toLowerCase() as 'left' | 'right' | 'up' | 'down';

        // Quick Look: arrow keys navigate between assets
        if (quickLookAsset) {
          const idx = filteredAssets.findIndex(a => a.id === quickLookAsset.id);
          if (direction === 'left' || direction === 'up') {
            if (idx > 0) setQuickLookAsset(filteredAssets[idx - 1]);
          } else {
            if (idx < filteredAssets.length - 1) setQuickLookAsset(filteredAssets[idx + 1]);
          }
          return;
        }

        const nextAsset = selectAdjacentAsset(direction, gridColumnCount);
        if (nextAsset) scrollAssetIntoView(nextAsset.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearSelection, deleteAssets, filteredAssets, gridColumnCount, quickLookAsset, selectAdjacentAsset, selectAllFilteredAssets, selectedAssetIds, setSelectionRating, undoLastDelete, renameDialog]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      const files: File[] = [];
      Array.from(event.clipboardData?.items ?? []).forEach((item, idx) => {
        if (item.kind !== 'file') return;
        const blob = item.getAsFile();
        if (!blob) return;
        const ext = blob.type.split('/')[1] || 'png';
        files.push(new File([blob], `pasted-${Date.now()}-${idx}.${ext}`, { type: blob.type || 'image/png', lastModified: Date.now() }));
      });
      if (files.length > 0) { event.preventDefault(); void addFiles(files); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  useEffect(() => {
    const close = () => { setContextMenu(null); setRenameDialog(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const copyAssetImage = async (asset: Asset) => {
    if (asset.type !== 'image' && asset.type !== 'vector') return;
    try {
      const response = await fetch(asset.url);
      let blob = await response.blob();
      if (blob.type !== 'image/png') {
        blob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas empty')), 'image/png');
            } else reject(new Error('No context'));
          };
          img.onerror = () => reject(new Error('Load error'));
          img.src = asset.url;
        });
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedToast('Image copied to clipboard');
      window.setTimeout(() => setCopiedToast(null), 1600);
    } catch (err) {
      console.error(err);
      await navigator.clipboard.writeText(asset.url);
      setCopiedToast('URL copied (Fallback)');
      window.setTimeout(() => setCopiedToast(null), 1600);
    } finally {
      setContextMenu(null);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToast(label);
      window.setTimeout(() => setCopiedToast(null), 1600);
    } catch { /* ignore */ }
    setContextMenu(null);
  };

  const handleQuickLookCopy = async () => {
    if (!quickLookAsset) return;
    try {
      if (quickLookAsset.type === 'image' || quickLookAsset.type === 'vector') {
        const response = await fetch(quickLookAsset.url);
        let blob = await response.blob();
        if (blob.type !== 'image/png') {
          blob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas empty')), 'image/png');
              } else reject(new Error('No context'));
            };
            img.onerror = () => reject(new Error('Load error'));
            img.src = quickLookAsset.url;
          });
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else {
        await navigator.clipboard.writeText(quickLookAsset.url);
      }
      setQuickLookCopied(true);
      window.setTimeout(() => setQuickLookCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(quickLookAsset.url);
        setQuickLookCopied(true);
        window.setTimeout(() => setQuickLookCopied(false), 1500);
      } catch {}
    }
  };

  const downloadAsset = (asset: Asset) => {
    downloadAssetFile(asset);
  };

  const quickLookIndex = quickLookAsset ? filteredAssets.findIndex(a => a.id === quickLookAsset.id) : -1;
  const qlHasPrev = quickLookIndex > 0;
  const qlHasNext = quickLookIndex < filteredAssets.length - 1;

  const emptyState = (() => {
    const trimmedSearch = searchQuery.trim();
    const visibleLibraryAssets = assets.filter(a => !a.deleted);
    const hasAdvancedFilters = typeFilters.size > 0 || tagFilters.size > 0 || Boolean(activeTag) ||
      Boolean(colorFilter) || orientationFilter !== 'all' || minRating > 0;

    if (activeFolder === 'All' && visibleLibraryAssets.length === 0 && !trimmedSearch && !hasAdvancedFilters) {
      return { icon: <UploadCloud size={44} strokeWidth={1.6} />, title: 'Drop files to import', detail: 'Add images, SVGs, videos, audio, PDFs, or fonts to start building your asset library.', onboarding: true };
    }
    if (trimmedSearch) return { icon: <Search size={30} strokeWidth={1.8} />, title: `No results for "${trimmedSearch}"`, detail: 'Try adjusting your search or filters.' };
    if (hasAdvancedFilters) return { icon: <Search size={30} strokeWidth={1.8} />, title: 'No matches', detail: 'No assets match the active filters.' };
    if (activeFolder === 'Starred') return { icon: <Star size={32} strokeWidth={1.8} />, title: 'No starred assets', detail: 'Star your favorite assets to find them here.' };
    if (activeFolder === 'Trash') return { icon: <Trash2 size={32} strokeWidth={1.8} />, title: 'Trash is empty', detail: '' };
    return { icon: <Search size={30} strokeWidth={1.8} />, title: 'No assets found', detail: 'Try adjusting your search or filters.' };
  })();

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 bg-[#1c1c1e] outline-none relative ${isDragging ? 'ring-2 ring-inset ring-blue-500' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
      onMouseDown={handleGridMouseDown}
      onDragEnter={(event) => { if (!hasDraggedFiles(event.dataTransfer)) return; event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => { if (!hasDraggedFiles(event.dataTransfer)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
      onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; setIsDragging(false); }}
      onDrop={(event) => { if (!hasDraggedFiles(event.dataTransfer)) return; event.preventDefault(); setIsDragging(false); if (event.dataTransfer.files.length > 0) void addFiles(event.dataTransfer.files); }}
    >

      {isDragging && (
        <div className="absolute inset-4 z-20 pointer-events-none rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center text-blue-300">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Upload size={18} /> Drop files to import
          </div>
        </div>
      )}

      {rubberBand && (
        <div
          className="fixed z-30 pointer-events-none border border-blue-500/70 bg-blue-500/10 rounded-sm"
          style={{ left: rubberBand.x1, top: rubberBand.y1, width: rubberBand.x2 - rubberBand.x1, height: rubberBand.y2 - rubberBand.y1 }}
        />
      )}

      {filteredAssets.length > 0 && viewMode === 'grid' && (
        <div ref={gridRef} className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))` }}>
          {filteredAssets.map(asset => (
            <AssetCard key={asset.id} asset={asset} isSelected={selectedAssetIds.has(asset.id)} thumbSize={thumbSize} cb={stableCb} />
          ))}
        </div>
      )}

      {/* Masonry/Waterfall — CSS columns. Note: columns re-layout on every resize.
          With 500+ cards this is measurable; grid view is faster for large libraries. */}
      {filteredAssets.length > 0 && viewMode === 'masonry' && (
        <div
          ref={gridRef}
          style={{ columns: `${thumbSize}px`, columnGap: '20px' }}
        >
          {filteredAssets.map(asset => (
            <div key={asset.id} className="break-inside-avoid mb-5">
              <AssetCard asset={asset} isSelected={selectedAssetIds.has(asset.id)} thumbSize={thumbSize} cb={stableCb} naturalRatio />
            </div>
          ))}
        </div>
      )}

      {filteredAssets.length > 0 && viewMode === 'list' && (
        <div className="w-full border border-zinc-800 rounded-xl overflow-hidden">
          <div className={`grid ${listGridColumns} gap-3 px-3 py-2 bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500`}>
            <div />
            <div className="min-w-0 truncate">Name</div>
            <div className="min-w-0 truncate">Type</div>
            <div className="min-w-0 truncate">Rating</div>
            <div className="min-w-0 truncate">Dimensions</div>
            <div className="min-w-0 truncate">Size</div>
            <div className="min-w-0 truncate">Added</div>
          </div>
          {filteredAssets.map(asset => {
            const isSelected = selectedAssetIds.has(asset.id);
            return (
              <div
                key={asset.id}
                ref={registerAssetNode(asset.id)}
                draggable
                onClick={(e) => handleAssetClick(e, asset.id)}
                onDoubleClick={() => openAssetPreview(asset)}
                onContextMenu={(e) => openContextMenu(e, asset)}
                onDragStart={(e) => startAssetDrag(e, asset.id)}
                onDrag={moveAssetDrag}
                onDragEnd={endAssetDrag}
                className={`group grid ${listGridColumns} gap-3 items-center px-3 py-2 border-b border-zinc-800/70 last:border-b-0 cursor-default text-xs ${
                  isSelected ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <div className="h-8 w-10 checker-bg-dark rounded overflow-hidden border border-zinc-700/60 flex items-center justify-center">
                  {renderPreview(asset)}
                </div>
                <div className="min-w-0 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStarred(asset.id); }}
                    className={`h-6 w-6 rounded flex items-center justify-center transition-opacity hover:bg-zinc-700 ${asset.starred || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    aria-label={asset.starred ? 'Remove from starred' : 'Add to starred'}
                  >
                    <Star size={14} className={asset.starred ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'} />
                  </button>
                  <span className="truncate font-medium">{asset.name}</span>
                </div>
                <div className="min-w-0 capitalize flex items-center gap-1.5 truncate text-zinc-400">
                  {asset.type === 'video' && <Film size={13} />}
                  {asset.type === 'vector' && <FileQuestion size={13} />}
                  <span className="truncate">{asset.type}</span>
                </div>
                <div className="min-w-0"><RatingStars value={asset.rating ?? 0} size={12} onChange={(r) => setAssetRating(asset.id, r)} /></div>
                <div className="min-w-0 truncate text-zinc-400">{asset.width} × {asset.height}</div>
                <div className="min-w-0 truncate text-zinc-400">{formatBytes(asset.size)}</div>
                <div className="min-w-0 truncate text-zinc-400">{formatDate(asset.dateAdded).split(',')[0]}</div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAssets.length === 0 && (
        <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-zinc-500 select-none">
          <div className={`mb-4 flex items-center justify-center rounded-full border border-dashed ${emptyState.onboarding ? 'h-20 w-20 border-blue-500/40 bg-blue-500/10 text-blue-400 empty-float' : 'border-transparent opacity-50'}`}>
            {emptyState.icon}
          </div>
          <div className="text-[14px] font-semibold text-zinc-300">{emptyState.title}</div>
          {emptyState.detail && <div className="mt-1.5 max-w-xs text-center text-xs leading-5 text-zinc-500">{emptyState.detail}</div>}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1.5 text-xs text-zinc-200 shadow-2xl shadow-black/60"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.section === 'main' ? (
            <>
              <button onClick={() => { openAssetPreview(contextMenu.asset); setContextMenu(null); }} className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors font-medium">
                Quick Look
              </button>
              <button onClick={() => window.open(contextMenu.asset.url, '_blank', 'noopener,noreferrer')} className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2">
                <ExternalLink size={12} className="text-zinc-500" /> Open Full Size
              </button>

              <div className="my-1 border-t border-zinc-700/60" />

              {/* Rename */}
              <button
                onClick={() => {
                  setRenameDialog({
                    x: contextMenu.x,
                    y: contextMenu.y + 240,
                    asset: contextMenu.asset,
                    value: contextMenu.asset.name,
                  });
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors"
              >
                Rename…
              </button>

              {/* Copy / ZIP options */}
              {selectedAssetIds.size > 1 ? (
                <button
                  onClick={() => { void exportAssetsAsZip(filteredAssets.filter(a => selectedAssetIds.has(a.id))); setContextMenu(null); }}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2"
                >
                  <Download size={12} className="text-zinc-500" /> Export as ZIP ({selectedAssetIds.size} files)
                </button>
              ) : (
                <button
                  onClick={() => void copyAssetImage(contextMenu.asset)}
                  disabled={contextMenu.asset.type === 'video' || contextMenu.asset.type === 'audio' || contextMenu.asset.type === 'pdf' || contextMenu.asset.type === 'font'}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors disabled:cursor-not-allowed disabled:text-zinc-600 flex items-center gap-2"
                >
                  <Copy size={12} className="text-zinc-500" /> Copy Image
                </button>
              )}
              <button
                onClick={() => void copyToClipboard(contextMenu.asset.name, 'Name copied')}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2"
              >
                <Copy size={12} className="text-zinc-500" /> Copy Name
              </button>
              <button
                onClick={() => void copyToClipboard(contextMenu.asset.url, 'URL copied')}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2"
              >
                <Copy size={12} className="text-zinc-500" /> Copy URL
              </button>

              <div className="my-1 border-t border-zinc-700/60" />

              {/* Label */}
              <button
                onClick={() => setContextMenu(c => c ? { ...c, section: 'label' } : null)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <LabelIcon size={12} className="text-zinc-500" /> Label
                  {contextMenu.asset.label && (
                    <span className="w-3 h-3 rounded-full border border-black/20 inline-block"
                      style={{ backgroundColor: COLOR_BUCKETS.find(b => b.name === contextMenu.asset.label)?.hex }} />
                  )}
                </span>
                <ChevronRight size={11} className="text-zinc-500" />
              </button>

              {/* Move to folder */}
              <button
                onClick={() => setContextMenu(c => c ? { ...c, section: 'move' } : null)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2"><FolderOpen size={12} className="text-zinc-500" /> Move to Folder</span>
                <ChevronRight size={11} className="text-zinc-500" />
              </button>

              {/* Download */}
              <button onClick={() => { downloadAsset(contextMenu.asset); setContextMenu(null); }} className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2">
                <Download size={12} className="text-zinc-500" /> Download
              </button>

              {/* Star */}
              <button onClick={() => { toggleStarred(contextMenu.asset.id); setContextMenu(null); }} className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors">
                {contextMenu.asset.starred ? 'Remove from Starred' : 'Add to Starred'}
              </button>

              {/* Rating */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-zinc-400">Rating</span>
                <RatingStars value={contextMenu.asset.rating ?? 0} size={13} onChange={(r) => { setAssetRating(contextMenu.asset.id, r); }} />
              </div>

              <div className="my-1 border-t border-zinc-700/60" />

              <button onClick={() => { selectAssets([contextMenu.asset.id]); setContextMenu(null); }} className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors">
                Get Info
              </button>
              <button onClick={() => { deleteAssets([contextMenu.asset.id]); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-900/25 transition-colors">
                Delete
              </button>
            </>
          ) : (
            contextMenu.section === 'label' ? (
            /* Label sub-panel */
            <>
              <button onClick={() => setContextMenu(c => c ? { ...c, section: 'main' } : null)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2 text-zinc-400">
                <ChevronLeft size={11} /> Back
              </button>
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Color Label</div>
              <button
                onClick={() => { setAssetLabel(contextMenu.asset.id, null); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2 text-zinc-400"
              >
                <span className="w-4 h-4 rounded-full border border-zinc-600 inline-flex items-center justify-center text-[8px] text-zinc-500">✕</span>
                <span>None</span>
                {!contextMenu.asset.label && <span className="ml-auto text-blue-400 text-[10px]">✓</span>}
              </button>
              {COLOR_BUCKETS.map(bucket => (
                <button
                  key={bucket.name}
                  onClick={() => { setAssetLabel(contextMenu.asset.id, bucket.name); setContextMenu(null); }}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0 border border-black/20" style={{ backgroundColor: bucket.hex }} />
                  <span className="text-zinc-300">{bucket.name}</span>
                  {contextMenu.asset.label === bucket.name && <span className="ml-auto text-blue-400 text-[10px]">✓</span>}
                </button>
              ))}
            </>
          ) : (
          /* Move to folder sub-panel */
            <>
              <button
                onClick={() => setContextMenu(c => c ? { ...c, section: 'main' } : null)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2 text-zinc-400"
              >
                <ChevronLeft size={11} /> Back
              </button>
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Move to folder</div>
              <div className="max-h-48 overflow-y-auto">
                <button
                  onClick={() => { assignAssetsToFolder(Array.from(selectedAssetIds), null); setContextMenu(null); }}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2 text-zinc-400"
                >
                  <span>—</span> No folder
                </button>
                {folderNames.map(folder => (
                  <button
                    key={folder}
                    onClick={() => { assignAssetsToFolder(Array.from(selectedAssetIds), folder); setContextMenu(null); }}
                    className="w-full px-3 py-2 text-left hover:bg-zinc-700/70 transition-colors flex items-center gap-2"
                  >
                    <FolderOpen size={12} className="text-amber-500 flex-shrink-0" /> <span className="truncate">{folder}</span>
                  </button>
                ))}
              </div>
            </>
          )
          )}
        </div>
      )}

      {renameDialog && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl shadow-black/60 p-3 w-64"
          style={{ left: Math.min(renameDialog.x, window.innerWidth - 280), top: Math.min(renameDialog.y, window.innerHeight - 100) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Rename</div>
          <input
            autoFocus
            value={renameDialog.value}
            onChange={(e) => setRenameDialog(d => d ? { ...d, value: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { renameAsset(renameDialog.asset.id, renameDialog.value); setRenameDialog(null); }
              if (e.key === 'Escape') setRenameDialog(null);
            }}
            onBlur={() => { renameAsset(renameDialog.asset.id, renameDialog.value); setRenameDialog(null); }}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      )}

      {dragOverlay && (
        <div
          className="fixed z-50 pointer-events-none rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/40"
          style={{ left: dragOverlay.x + 12, top: dragOverlay.y + 12 }}
        >
          Moving {dragOverlay.count} {dragOverlay.count === 1 ? 'asset' : 'assets'}
        </div>
      )}

      {copiedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast-enter bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-xs font-semibold text-zinc-200 shadow-xl pointer-events-none">
          {copiedToast}
        </div>
      )}

      {quickLookAsset && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={() => { if (isAnnotating) return; setQuickLookAsset(null); setQuickLookScale(1); setIsAnnotating(false); }}
          onWheel={(e) => { if (isAnnotating) return; e.preventDefault(); setQuickLookScale(s => Math.min(4, Math.max(0.5, s - e.deltaY * 0.001))); }}
        >
          {/* Prev/Next navigation */}
          {!isAnnotating && qlHasPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); setQuickLookAsset(filteredAssets[quickLookIndex - 1]); setQuickLookScale(1); setIsAnnotating(false); annotationHistoryRef.current = []; }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
              aria-label="Previous asset"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {!isAnnotating && qlHasNext && (
            <button
              onClick={(e) => { e.stopPropagation(); setQuickLookAsset(filteredAssets[quickLookIndex + 1]); setQuickLookScale(1); setIsAnnotating(false); annotationHistoryRef.current = []; }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-sm flex items-center justify-center text-white transition-colors shadow-lg"
              aria-label="Next asset"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div
            className="quicklook-panel relative flex max-h-[88vh] max-w-[88vw] items-center justify-center overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top toolbar */}
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
              {!isAnnotating && (quickLookAsset.type === 'image' || quickLookAsset.type === 'vector') && (
                <button
                  onClick={() => {
                    setIsAnnotating(true); setIsErasing(false); annotationHistoryRef.current = [];
                    requestAnimationFrame(() => {
                      const canvas = annotationCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      if (quickLookAsset.annotationDataUrl) {
                        const img = new Image();
                        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        img.src = quickLookAsset.annotationDataUrl;
                      }
                    });
                  }}
                  className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-zinc-200 shadow-sm backdrop-blur hover:bg-black/80"
                >
                  <span className="inline-flex items-center gap-1"><Pencil size={10} /> Annotate</span>
                </button>
              )}
              {isAnnotating && (
                <>
                  {['#ff3b30','#ff9500','#ffcc00','#30d158','#0a84ff','#bf5af2','#ffffff'].map(c => (
                    <button key={c} onClick={() => { setAnnotationColor(c); setIsErasing(false); }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${annotationColor === c && !isErasing ? 'border-white scale-110' : 'border-zinc-600'}`}
                      style={{ backgroundColor: c }} title={c} />
                  ))}
                  <select value={annotationSize} onChange={e => setAnnotationSize(Number(e.target.value))}
                    className="rounded bg-black/60 border-0 text-zinc-200 text-[10px] px-1 py-0.5 outline-none">
                    <option value={2}>Thin</option>
                    <option value={4}>Medium</option>
                    <option value={8}>Thick</option>
                    <option value={16}>Bold</option>
                  </select>
                  <button onClick={() => setIsErasing(v => !v)}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur ${isErasing ? 'bg-amber-500/80 text-white' : 'bg-black/60 text-zinc-300 hover:bg-black/80'}`}>
                    <span className="inline-flex items-center gap-1"><Eraser size={10} /> Erase</span>
                  </button>
                  <button onClick={() => {
                    const canvas = annotationCanvasRef.current; if (!canvas) return;
                    const ctx = canvas.getContext('2d'); if (!ctx) return;
                    const prev = annotationHistoryRef.current.pop();
                    if (prev) ctx.putImageData(prev, 0, 0);
                  }} className="rounded-md bg-black/60 px-2 py-1 text-[10px] text-zinc-300 shadow-sm backdrop-blur hover:bg-black/80">
                    <span className="inline-flex items-center gap-1"><Undo2 size={10} /> Undo</span>
                  </button>
                  <button onClick={() => {
                    const canvas = annotationCanvasRef.current; if (!canvas) return;
                    const ctx = canvas.getContext('2d'); if (!ctx) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    annotationHistoryRef.current = [];
                  }} className="rounded-md bg-black/60 px-2 py-1 text-[10px] text-zinc-300 shadow-sm backdrop-blur hover:bg-black/80">Clear</button>
                  <button onClick={() => {
                    const canvas = annotationCanvasRef.current;
                    if (canvas) setAssetAnnotation(quickLookAsset.id, canvas.toDataURL('image/png'));
                    setIsAnnotating(false);
                  }} className="rounded-md bg-green-600/80 px-2 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur hover:bg-green-600">
                    <span className="inline-flex items-center gap-1"><CheckCircle2 size={10} /> Save</span>
                  </button>
                  <button onClick={() => setIsAnnotating(false)}
                    className="rounded-md bg-black/60 px-2 py-1 text-[10px] text-zinc-300 shadow-sm backdrop-blur hover:bg-black/80">Cancel</button>
                </>
              )}
              {!isAnnotating && (
                <>
                  <button onClick={() => downloadAsset(quickLookAsset)}
                    className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-zinc-200 shadow-sm backdrop-blur hover:bg-black/80">
                    <span className="inline-flex items-center gap-1">Download <Download size={10} /></span>
                  </button>
                  <button onClick={handleQuickLookCopy}
                    className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-zinc-200 shadow-sm backdrop-blur hover:bg-black/80 min-w-[50px] transition-all duration-200">
                    {quickLookCopied ? (
                      <span className="inline-flex items-center gap-1 text-green-400 font-semibold scale-105">
                        Copied! <ClipboardCheck size={10} className="text-green-400" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        Copy <Clipboard size={10} />
                      </span>
                    )}
                  </button>
                  <button onClick={() => window.open(quickLookAsset.url, '_blank', 'noopener,noreferrer')}
                    className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-zinc-200 shadow-sm backdrop-blur hover:bg-black/80">
                    <span className="inline-flex items-center gap-1">Open <ExternalLink size={10} /></span>
                  </button>
                  <button
                    autoFocus
                    onClick={() => { setQuickLookAsset(null); setQuickLookScale(1); setIsAnnotating(false); }}
                    className="flex h-6 items-center justify-center gap-1 rounded-md bg-black/60 text-zinc-300 shadow-sm backdrop-blur hover:bg-black/80 hover:text-white px-1.5 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <X size={12} /><span className="text-[9px] font-medium text-zinc-500">ESC</span>
                  </button>
                </>
              )}
            </div>

            {/* Asset preview */}
            {quickLookAsset.url && (quickLookAsset.type === 'image' || quickLookAsset.type === 'vector') && (
              <div className="relative" style={{ cursor: isAnnotating ? (isErasing ? 'cell' : 'crosshair') : undefined }}>
                <img
                  src={quickLookAsset.url}
                  alt={quickLookAsset.name}
                  className="max-h-[88vh] max-w-[88vw] object-contain transition-transform duration-100 block"
                  style={{ transform: `scale(${isAnnotating ? 1 : quickLookScale})`, cursor: isAnnotating ? 'inherit' : (quickLookScale > 1 ? 'zoom-out' : 'zoom-in') }}
                  onClick={e => { if (!isAnnotating) { e.stopPropagation(); setQuickLookScale(s => s > 1 ? 1 : 2); } }}
                  draggable={false}
                />
                {!isAnnotating && quickLookAsset.annotationDataUrl && (
                  <img src={quickLookAsset.annotationDataUrl} alt="annotation"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ transform: `scale(${quickLookScale})` }}
                  />
                )}
                {isAnnotating && (
                  <canvas
                    ref={annotationCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ touchAction: 'none' }}
                    onMouseDown={e => {
                      const canvas = annotationCanvasRef.current; if (!canvas) return;
                      const ctx = canvas.getContext('2d'); if (!ctx) return;
                      annotationHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                      if (annotationHistoryRef.current.length > 20) annotationHistoryRef.current.shift();
                      isDrawingRef.current = true;
                      const rect = canvas.getBoundingClientRect();
                      ctx.beginPath();
                      ctx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
                    }}
                    onMouseMove={e => {
                      if (!isDrawingRef.current) return;
                      const canvas = annotationCanvasRef.current; if (!canvas) return;
                      const ctx = canvas.getContext('2d'); if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                      if (isErasing) { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = annotationSize * 4; }
                      else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = annotationColor; ctx.lineWidth = annotationSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
                      ctx.lineTo(x, y); ctx.stroke();
                    }}
                    onMouseUp={() => { isDrawingRef.current = false; }}
                    onMouseLeave={() => { isDrawingRef.current = false; }}
                  />
                )}
              </div>
            )}
            {quickLookAsset.type === 'video' && (
              <video src={quickLookAsset.url} className="max-h-[88vh] max-w-[88vw] bg-black rounded-xl" controls autoPlay playsInline />
            )}
            {(quickLookAsset.type === 'audio' || quickLookAsset.type === 'pdf' || quickLookAsset.type === 'font') && (
              <div className="w-[480px] min-h-[280px] flex items-center justify-center">
                {renderPreview(quickLookAsset, 'large')}
              </div>
            )}

            {/* Bottom bar: name, dimensions, counter, rating */}
            {!isAnnotating && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent px-5 pb-4 pt-10 rounded-b-2xl">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{quickLookAsset.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {quickLookAsset.width && quickLookAsset.height ? `${quickLookAsset.width} × ${quickLookAsset.height} · ` : ''}
                    {formatBytes(quickLookAsset.size)}
                    {filteredAssets.length > 1 && (
                      <span className="ml-2 text-zinc-500">{quickLookIndex + 1} / {filteredAssets.length}</span>
                    )}
                  </div>
                </div>
                <RatingStars value={quickLookAsset.rating ?? 0} size={16} onChange={(r) => setAssetRating(quickLookAsset.id, r)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
