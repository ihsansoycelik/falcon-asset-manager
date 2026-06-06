import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Plus, List, LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight,
  Trash2, Star, StarOff, Tag, FolderOpen, Download, X, ArrowUpDown, RectangleHorizontal,
  RectangleVertical, Square, Check, Link, Loader2, CaseSensitive,
  Rows3, FileDown, FileUp, MoreHorizontal
} from 'lucide-react';
import { useStore } from '../store/AssetContext';
import { Asset, COLOR_BUCKETS, Orientation, SortBy, SortOrder } from '../types';

export default function Toolbar() {
  const {
    assets,
    searchQuery,
    setSearchQuery,
    activeFolder,
    smartFolders,
    emptyTrash,
    addFiles,
    addFileFromUrl,
    isLoadingUrl,
    viewMode,
    setViewMode,
    thumbSize,
    setThumbSize,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    typeFilters,
    toggleTypeFilter,
    tagFilters,
    toggleTagFilter,
    colorFilter,
    setColorFilter,
    labelFilter,
    setLabelFilter,
    orientationFilter,
    setOrientationFilter,
    minRating,
    setMinRating,
    activeFilterCount,
    clearAdvancedFilters,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    selectedAssetIds,
    clearSelection,
    toggleStarred,
    addAssetTag,
    assignAssetsToFolder,
    deleteAssets,
    batchRenameAssets,
    folderNames,
    exportLibrary,
    importLibrary,
    isImporting,
  } = useStore();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState('');
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState(false);
  const [batchRenamePattern, setBatchRenamePattern] = useState('{name}');
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importLibraryInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const trashCount = assets.filter(asset => asset.deleted).length;
  const allTags = useMemo(() => Array.from(new Set(assets.filter(asset => !asset.deleted).flatMap(asset => asset.tags))).sort(), [assets]);
  const selectedCount = selectedAssetIds.size;
  const selectedAssets = useMemo(() => assets.filter(a => selectedAssetIds.has(a.id)), [assets, selectedAssetIds]);
  const allSelectedStarred = selectedAssets.length > 0 && selectedAssets.every(a => a.starred);

  const sortOptions: Array<{ label: string; sortBy: SortBy; sortOrder: SortOrder }> = [
    { label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Name Z–A', sortBy: 'name', sortOrder: 'desc' },
    { label: 'Newest first', sortBy: 'dateAdded', sortOrder: 'desc' },
    { label: 'Oldest first', sortBy: 'dateAdded', sortOrder: 'asc' },
    { label: 'Largest size', sortBy: 'size', sortOrder: 'desc' },
    { label: 'Dimensions', sortBy: 'dimensions', sortOrder: 'desc' },
    { label: 'Highest rated', sortBy: 'rating', sortOrder: 'desc' },
  ];
  const typeOptions: Array<{ label: string; value: Asset['type'] }> = [
    { label: 'Images', value: 'image' },
    { label: 'Vectors', value: 'vector' },
    { label: 'Videos', value: 'video' },
    { label: 'Audio', value: 'audio' },
    { label: 'PDFs', value: 'pdf' },
    { label: 'Fonts', value: 'font' },
  ];
  const orientationOptions: Array<{ label: string; value: Orientation; icon: React.ReactNode }> = [
    { label: 'All', value: 'all', icon: <ArrowUpDown size={13} /> },
    { label: 'Landscape', value: 'landscape', icon: <RectangleHorizontal size={13} /> },
    { label: 'Portrait', value: 'portrait', icon: <RectangleVertical size={13} /> },
    { label: 'Square', value: 'square', icon: <Square size={13} /> },
  ];

  const folderLabel = activeFolder.startsWith('folder:')
    ? decodeURIComponent(activeFolder.slice('folder:'.length))
    : activeFolder.startsWith('sf_')
      ? (smartFolders.find(sf => sf.id === activeFolder)?.name ?? activeFolder)
      : activeFolder;
  const activeSortLabel = sortOptions.find(o => o.sortBy === sortBy && o.sortOrder === sortOrder)?.label ?? 'Custom';

  const handleBulkStar = () => {
    if (allSelectedStarred) {
      // unstar all
      selectedAssets.filter(a => a.starred).forEach(asset => toggleStarred(asset.id));
    } else {
      // star all
      selectedAssets.filter(a => !a.starred).forEach(asset => toggleStarred(asset.id));
    }
  };
  const handleBulkDelete = () => deleteAssets(Array.from(selectedAssetIds));
  const handleBulkTagSubmit = () => {
    const tag = bulkTagValue.trim();
    if (tag) Array.from(selectedAssetIds).forEach(id => addAssetTag(id, tag));
    setBulkTagValue('');
    setIsBulkTagOpen(false);
  };
  const handleBulkMove = (folder: string | null) => assignAssetsToFolder(Array.from(selectedAssetIds), folder);

  const handleUrlSubmit = async () => {
    const url = urlInputValue.trim();
    if (!url) return;
    await addFileFromUrl(url);
    setUrlInputValue('');
    setIsUrlInputOpen(false);
  };

  const handleBatchRenameSubmit = () => {
    const ids = Array.from(selectedAssetIds);
    batchRenameAssets(ids, batchRenamePattern);
    setIsBatchRenameOpen(false);
    setBatchRenamePattern('{name}');
  };

  // Close panels on outside click / escape
  useEffect(() => {
    if (!isFilterOpen && !isSortOpen && !isMoreOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        filterRef.current?.contains(event.target as Node) ||
        sortRef.current?.contains(event.target as Node) ||
        moreRef.current?.contains(event.target as Node)
      ) return;
      setIsFilterOpen(false);
      setIsSortOpen(false);
      setIsMoreOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsFilterOpen(false); setIsSortOpen(false); setIsMoreOpen(false); }
    };
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFilterOpen, isSortOpen, isMoreOpen]);

  return (
    <div className="h-[52px] border-b border-zinc-800 bg-[#161616] flex items-center justify-between px-4 sticky top-0 z-10 flex-shrink-0 select-none">
      {/* Left: navigation + title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-zinc-500">
          <button onClick={goBack} disabled={!canGoBack} className="p-1 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button onClick={goForward} disabled={!canGoForward} className="p-1 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="font-semibold text-zinc-100 text-[14px]">{folderLabel}</div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2.5">
        {selectedCount > 0 ? (
          <div className="bulk-bar-enter flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 rounded-xl px-3 py-1.5 text-sm overflow-x-auto max-w-[calc(100vw-320px)]">
            <div className="font-semibold text-blue-300 pr-2.5 border-r border-blue-500/30">{selectedCount} selected</div>

            {/* Star / Unstar */}
            <button
              onClick={handleBulkStar}
              className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-500/20 rounded-lg text-blue-300 transition-colors"
              title={allSelectedStarred ? 'Unstar all selected' : 'Star all selected'}
            >
              {allSelectedStarred ? <StarOff size={15} /> : <Star size={15} />}
              <span className="text-xs font-medium">{allSelectedStarred ? 'Unstar' : 'Star'}</span>
            </button>

            {/* Bulk tag */}
            {isBulkTagOpen ? (
              <input
                autoFocus
                value={bulkTagValue}
                onChange={(e) => setBulkTagValue(e.target.value)}
                onBlur={handleBulkTagSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleBulkTagSubmit(); }
                  if (e.key === 'Escape') { setBulkTagValue(''); setIsBulkTagOpen(false); }
                }}
                className="w-28 border border-blue-500/40 bg-zinc-900 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-zinc-600 text-blue-200"
                placeholder="tag name…"
              />
            ) : (
              <button onClick={() => setIsBulkTagOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-500/20 rounded-lg text-blue-300 transition-colors" title="Add tag to all selected">
                <Tag size={15} /> <span className="text-xs font-medium">Tag</span>
              </button>
            )}

            {/* Move to folder */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-500/20 rounded-lg text-blue-300 transition-colors" title="Move to folder">
                <FolderOpen size={15} /> <span className="text-xs font-medium">Move</span>
              </button>
              <div className="absolute right-0 hidden group-hover:block pt-2 z-50">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 w-56 text-sm">
                  <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Move to folder</div>
                  <button onClick={() => handleBulkMove(null)} className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-zinc-300 flex items-center gap-2">
                    <span className="text-zinc-500">—</span> No folder
                  </button>
                  {folderNames.map(folder => (
                    <button key={folder} onClick={() => handleBulkMove(folder)} className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-zinc-300 flex items-center gap-2">
                      <FolderOpen size={14} className="text-amber-500" /> {folder}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Download all */}
            <button
              onClick={() => selectedAssets.forEach(asset => {
                const link = document.createElement('a');
                link.href = asset.url; link.download = asset.name; link.click();
              })}
              className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-500/20 rounded-lg text-blue-300 transition-colors"
              title="Download all selected"
            >
              <Download size={15} /> <span className="text-xs font-medium">Download</span>
            </button>

            {/* Batch rename */}
            {isBatchRenameOpen ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={batchRenamePattern}
                  onChange={e => setBatchRenamePattern(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleBatchRenameSubmit(); }
                    if (e.key === 'Escape') { setBatchRenamePattern('{name}'); setIsBatchRenameOpen(false); }
                  }}
                  placeholder="{name} {index}"
                  className="w-32 border border-blue-500/40 bg-zinc-900 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/30 text-blue-200 placeholder:text-zinc-600"
                />
                <button onClick={handleBatchRenameSubmit} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-blue-300 text-xs"><Check size={13} /></button>
                <button onClick={() => { setBatchRenamePattern('{name}'); setIsBatchRenameOpen(false); }} className="px-1 py-1 hover:bg-blue-500/20 rounded-lg text-blue-400"><X size={13} /></button>
              </div>
            ) : (
              <button onClick={() => setIsBatchRenameOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-blue-500/20 rounded-lg text-blue-300 transition-colors" title="Batch rename selected ({name}, {index}, {date})">
                <CaseSensitive size={15} /> <span className="text-xs font-medium">Rename</span>
              </button>
            )}

            {/* Delete */}
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors ml-1" title="Delete selected">
              <Trash2 size={15} /> <span className="text-xs font-medium">Delete</span>
            </button>
            <button onClick={clearSelection} className="ml-1 p-1 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Clear selection">
              <X size={17} />
            </button>
          </div>
        ) : (
          <div className="relative group w-[220px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, tag, note…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800/80 hover:bg-zinc-800 focus:bg-zinc-900 border border-transparent focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 rounded-lg pl-8 pr-3 py-1.5 text-[13px] outline-none transition-colors placeholder:text-zinc-600 text-zinc-200"
            />
          </div>
        )}

        {/* Thumbnail size slider — grid / masonry only */}
        {selectedCount === 0 && viewMode !== 'list' && (
          <div className="hidden md:flex items-center gap-2 px-1" title="Thumbnail size">
            <LayoutGrid size={12} className="text-zinc-600" />
            <input
              type="range"
              min={130}
              max={320}
              step={10}
              value={thumbSize}
              onChange={(e) => setThumbSize(Number(e.target.value))}
              className="falcon-slider w-20"
              aria-label="Thumbnail size"
            />
          </div>
        )}

        {/* View toggles */}
        <div className="flex items-center bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700/60">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('masonry')}
            className={`p-1 rounded-md transition-colors ${viewMode === 'masonry' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            aria-label="Masonry view"
            title="Masonry / Waterfall view"
          >
            <Rows3 size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            aria-label="List view"
            title="List view"
          >
            <List size={15} strokeWidth={2} />
          </button>
        </div>

        {selectedCount === 0 && (
          <>
            {/* Sort */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setIsSortOpen(p => !p); setIsFilterOpen(false); setIsMoreOpen(false); }}
                className={`transition-colors px-2 py-1.5 flex items-center gap-1.5 border border-zinc-700/60 rounded-lg text-xs ${
                  isSortOpen ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Sort"
              >
                <ArrowUpDown size={14} />
                <span className="hidden lg:inline">{activeSortLabel}</span>
              </button>
              {isSortOpen && (
                <div className="panel-enter absolute right-0 top-9 w-52 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 p-1 text-xs text-zinc-300 z-50">
                  {sortOptions.map(option => {
                    const isActive = sortBy === option.sortBy && sortOrder === option.sortOrder;
                    return (
                      <button
                        key={option.label}
                        onClick={() => { setSortBy(option.sortBy); setSortOrder(option.sortOrder); setIsSortOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left ${isActive ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-zinc-700'}`}
                      >
                        {option.label}
                        {isActive && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setIsFilterOpen(p => !p); setIsSortOpen(false); setIsMoreOpen(false); }}
                className={`relative transition-colors p-1.5 flex items-center justify-center border border-zinc-700/60 rounded-lg ${
                  isFilterOpen || activeFilterCount > 0 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                aria-label="Filter"
                title="Filter"
              >
                <SlidersHorizontal size={15} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>

              {isFilterOpen && (
                <div className="panel-enter absolute right-0 top-9 w-72 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-3.5 text-xs text-zinc-300 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-zinc-100 text-[13px]">Filters</div>
                    <button onClick={clearAdvancedFilters} className="text-[11px] text-blue-400 hover:text-blue-300">Reset all</button>
                  </div>

                  <div className="mb-3.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">File Type</div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
                      {typeOptions.map(option => {
                        const active = typeFilters.has(option.value);
                        return (
                          <button
                            key={option.value}
                            onClick={() => toggleTypeFilter(option.value)}
                            className={`px-2 py-1.5 rounded-lg border text-center ${active ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Orientation</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {orientationOptions.map(option => {
                        const active = orientationFilter === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setOrientationFilter(option.value)}
                            className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg border ${active ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'}`}
                            title={option.label}
                          >
                            {option.icon}
                            <span className="text-[9px]">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Minimum Rating</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setMinRating(minRating === star ? 0 : star)}
                          className="p-0.5"
                          aria-label={`At least ${star} stars`}
                        >
                          <Star size={18} className={star <= minRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600 hover:text-zinc-500'} />
                        </button>
                      ))}
                      {minRating > 0 && <button onClick={() => setMinRating(0)} className="ml-1 text-[11px] text-blue-400 hover:text-blue-300">clear</button>}
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Palette Color</div>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_BUCKETS.map(bucket => {
                        const active = colorFilter === bucket.name;
                        return (
                          <button
                            key={bucket.name}
                            onClick={() => setColorFilter(active ? null : bucket.name)}
                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${active ? 'border-blue-400 ring-2 ring-blue-500/30' : 'border-zinc-700'}`}
                            style={{ backgroundColor: bucket.hex }}
                            title={bucket.name}
                            aria-label={`Filter by palette color ${bucket.name}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Label</div>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_BUCKETS.map(bucket => {
                        const active = labelFilter === bucket.name;
                        return (
                          <button
                            key={bucket.name}
                            onClick={() => setLabelFilter(active ? null : bucket.name)}
                            className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${active ? 'border-blue-400 ring-2 ring-blue-500/30' : 'border-zinc-700'}`}
                            style={{ backgroundColor: bucket.hex }}
                            title={`Label: ${bucket.name}`}
                            aria-label={`Filter by label ${bucket.name}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Tags</div>
                      <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => toggleTagFilter(tag)}
                            className={`px-2 py-0.5 border rounded text-[10px] ${tagFilters.has(tag) ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-700/50'}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty trash button */}
        {selectedCount === 0 && activeFolder === 'Trash' && trashCount > 0 && (
          <button
            onClick={emptyTrash}
            className="bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-[13px] font-medium px-3 py-1.5 flex items-center gap-1.5 transition-colors border border-red-500/30"
          >
            <Trash2 size={15} strokeWidth={2.5} /> Empty Trash
          </button>
        )}

        {selectedCount === 0 && (
          <>
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.svg,.pdf,.ttf,.otf,.woff,.woff2"
              multiple
              className="hidden"
              onChange={event => {
                if (event.target.files) { void addFiles(event.target.files); event.target.value = ''; }
              }}
            />
            <input
              ref={importLibraryInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async event => {
                const file = event.target.files?.[0];
                if (file) { await importLibrary(file); event.target.value = ''; }
              }}
            />

            {/* URL import */}
            {isUrlInputOpen ? (
              <div className="flex items-center gap-1">
                <input
                  ref={urlInputRef}
                  autoFocus
                  type="url"
                  value={urlInputValue}
                  onChange={e => setUrlInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); void handleUrlSubmit(); }
                    if (e.key === 'Escape') { setUrlInputValue(''); setIsUrlInputOpen(false); }
                  }}
                  placeholder="https://…"
                  disabled={isLoadingUrl}
                  className="w-48 border border-zinc-600 bg-zinc-900 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 placeholder:text-zinc-600 text-zinc-200 disabled:opacity-50"
                />
                <button
                  onClick={() => void handleUrlSubmit()}
                  disabled={isLoadingUrl || !urlInputValue.trim()}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  {isLoadingUrl ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button onClick={() => { setUrlInputValue(''); setIsUrlInputOpen(false); }} className="px-1.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsUrlInputOpen(true); setTimeout(() => urlInputRef.current?.focus(), 50); }}
                className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 rounded-lg text-[13px] font-medium px-2.5 py-1.5 flex items-center gap-1.5 transition-colors"
                title="Import from URL"
              >
                <Link size={14} />
              </button>
            )}

            {/* More menu (export/import) */}
            {!isUrlInputOpen && (
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => { setIsMoreOpen(p => !p); setIsFilterOpen(false); setIsSortOpen(false); }}
                  className={`bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 rounded-lg px-2.5 py-1.5 flex items-center transition-colors ${isMoreOpen ? 'bg-zinc-800 text-zinc-200' : ''}`}
                  title="More options"
                >
                  <MoreHorizontal size={15} />
                </button>
                {isMoreOpen && (
                  <div className="panel-enter absolute right-0 top-9 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 text-xs text-zinc-300 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Library</div>
                    <button
                      onClick={() => { void exportLibrary(); setIsMoreOpen(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-700 transition-colors flex items-center gap-2.5"
                    >
                      <FileDown size={13} className="text-zinc-400" /> Export Library…
                    </button>
                    <button
                      onClick={() => { importLibraryInputRef.current?.click(); setIsMoreOpen(false); }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-700 transition-colors flex items-center gap-2.5"
                    >
                      <FileUp size={13} className="text-zinc-400" /> Import Library…
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Primary add button */}
            {!isUrlInputOpen && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="ml-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-[13px] font-medium px-3 py-1.5 flex items-center gap-1.5 shadow-sm shadow-blue-900/30 transition-colors"
              >
                {isImporting
                  ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  : <><Plus size={15} strokeWidth={2.5} /> Add</>
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
