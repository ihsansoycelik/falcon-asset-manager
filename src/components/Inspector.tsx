import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AssetContext';
import { formatBytes, formatDate, formatRelativeDate } from '../lib/utils';
import RatingStars from './RatingStars';
import { Download, ImageIcon, BoxSelect, Tag as TagIcon, Trash2, RotateCcw, Star, XCircle, Music, Info, Clipboard, Copy } from 'lucide-react';

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <React.Fragment>
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-medium text-right break-words">{value}</span>
    </React.Fragment>
  );
}

export default function Inspector() {
  const {
    assets,
    selectedAssetIds,
    activeFolder,
    setActiveFolder,
    setActiveTag,
    deleteAssets,
    restoreAssets,
    deleteAssetsPermanently,
    toggleStarred,
    renameAsset,
    addAssetTag,
    removeAssetTag,
    setAssetRating,
    setSelectionRating,
    setAssetNote,
    folderNames,
    assignAssetsToFolder,
    showToast,
  } = useStore();
  const [draftName, setDraftName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [draftTag, setDraftTag] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isAddingBulkTag, setIsAddingBulkTag] = useState(false);
  const [draftBulkTag, setDraftBulkTag] = useState('');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const selectedId = Array.from(selectedAssetIds)[0];
  const asset = assets.find(a => a.id === selectedId);
  const allExistingTags = React.useMemo(
    () => Array.from(new Set(assets.flatMap(a => a.tags))).sort(),
    [assets]
  );

  useEffect(() => {
    if (!asset) return;
    // Flush any pending note save before switching assets
    if (noteDebounceRef.current) {
      clearTimeout(noteDebounceRef.current);
      noteDebounceRef.current = null;
    }
    setDraftName(asset.name);
    setDraftNote(asset.note ?? '');
    setIsAddingTag(false);
    setDraftTag('');
    setCopiedColor(null);
    setCopiedText(null);
  }, [asset?.id]);  // intentionally only re-init on id change, not on every field update

  // Flush debounce on unmount
  useEffect(() => () => { if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current); }, []);

  if (selectedAssetIds.size === 0) {
    return (
      <div className="w-72 bg-[#161616] border-l border-zinc-800 flex-shrink-0 flex flex-col items-center justify-center text-zinc-600 select-none h-full">
        <ImageIcon size={32} className="mb-3 opacity-30" />
        <div className="text-[13px] font-medium text-zinc-400">No item selected</div>
        <div className="text-[11px] text-zinc-600 mt-1">Select an asset to view details</div>
      </div>
    );
  }

  const commitBulkTag = () => {
    const tag = draftBulkTag.trim();
    if (tag) Array.from(selectedAssetIds).forEach(id => addAssetTag(id, tag));
    setDraftBulkTag('');
    setIsAddingBulkTag(false);
  };

  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      showToast(`Copied ${color}`);
      window.setTimeout(() => setCopiedColor(current => current === color ? null : current), 1200);
    } catch {
      setCopiedColor(null);
      showToast('Failed to copy color to clipboard');
    }
  };

  if (selectedAssetIds.size > 1) {
    const selectedAssets = assets.filter(a => selectedAssetIds.has(a.id));
    const totalSize = selectedAssets.reduce((sum, a) => sum + a.size, 0);
    const isTrashSelection = activeFolder === 'Trash' || selectedAssets.every(a => a.deleted);
    const typeCounts = (['image', 'vector', 'video', 'audio', 'pdf', 'font'] as const)
      .map(type => ({ type, count: selectedAssets.filter(a => a.type === type).length }))
      .filter(entry => entry.count > 0);
    const starredCount = selectedAssets.filter(a => a.starred).length;

    return (
      <aside className="w-72 bg-[#161616] border-l border-zinc-800 flex flex-col flex-shrink-0 h-full select-none">
        <div className="p-6 flex flex-col items-center justify-center border-b border-zinc-800 pb-8">
          <div className="w-16 h-16 bg-blue-500/15 text-blue-400 rounded-full flex items-center justify-center mb-4 border border-blue-500/25">
            <BoxSelect size={28} />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">{selectedAssetIds.size} Items Selected</h2>
          <p className="text-xs text-zinc-500 mt-1">{formatBytes(totalSize)} total size</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Summary</div>
            <div className="grid grid-cols-2 gap-2">
              {typeCounts.map(({ type, count }) => (
                <div key={type} className="bg-zinc-900 rounded-lg border border-zinc-800 px-3 py-2.5 text-center">
                  <div className="text-base font-bold text-zinc-100">{count}</div>
                  <div className="text-[10px] text-zinc-500 capitalize mt-0.5">{type}s</div>
                </div>
              ))}
              {starredCount > 0 && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 px-3 py-2.5 text-center">
                  <div className="text-base font-bold text-zinc-100">{starredCount}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Starred</div>
                </div>
              )}
            </div>
          </div>

          {!isTrashSelection && (
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Rate all</div>
              <RatingStars value={0} size={20} onChange={(r) => setSelectionRating(r)} />
            </div>
          )}
        </div>

        <div className="mt-auto p-4 border-t border-zinc-800 space-y-2">
          {isTrashSelection ? (
            <>
              <button onClick={() => restoreAssets(Array.from(selectedAssetIds))} className="w-full py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <RotateCcw size={14} /> Restore Selected
              </button>
              <button onClick={() => deleteAssetsPermanently(Array.from(selectedAssetIds))} className="w-full py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <XCircle size={14} /> Delete Permanently
              </button>
            </>
          ) : (
            <>
              <select
                value="__noop"
                onChange={(event) => {
                  if (event.target.value === '__noop') return;
                  const folder = event.target.value === '__none' ? null : event.target.value;
                  assignAssetsToFolder(Array.from(selectedAssetIds), folder);
                  event.target.value = '__noop';
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs font-semibold text-zinc-200 outline-none hover:bg-zinc-800"
                aria-label="Move selected assets to folder"
              >
                <option value="__noop">Move to folder…</option>
                <option value="__none">No folder</option>
                {folderNames.map(folder => <option key={folder} value={folder}>{folder}</option>)}
              </select>
              {isAddingBulkTag ? (
                <input
                  value={draftBulkTag}
                  onChange={(event) => setDraftBulkTag(event.target.value)}
                  onBlur={commitBulkTag}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') { event.preventDefault(); commitBulkTag(); }
                    if (event.key === 'Escape') { setDraftBulkTag(''); setIsAddingBulkTag(false); }
                  }}
                  autoFocus
                  className="w-full py-2 px-3 bg-zinc-900 border border-blue-500/40 text-zinc-200 text-xs font-semibold rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600"
                  placeholder="Tag for selected assets"
                />
              ) : (
                <button onClick={() => setIsAddingBulkTag(true)} className="w-full py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <TagIcon size={14} /> Add Tags
                </button>
              )}
              <button onClick={() => deleteAssets(Array.from(selectedAssetIds))} className="w-full py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Trash2 size={14} /> Delete Selected
              </button>
            </>
          )}
        </div>
      </aside>
    );
  }

  if (!asset) return null;

  const commitRename = () => {
    renameAsset(asset.id, draftName);
    setDraftName(draftName.trim() || asset.name);
  };
  const commitTag = () => {
    addAssetTag(asset.id, draftTag);
    setDraftTag('');
    setIsAddingTag(false);
  };
  const commitNote = () => {
    if (noteDebounceRef.current) { clearTimeout(noteDebounceRef.current); noteDebounceRef.current = null; }
    if (draftNote !== (asset.note ?? '')) setAssetNote(asset.id, draftNote);
  };
  const downloadAsset = () => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopyImage = async () => {
    if (!asset) return;
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
      setCopiedText('Copied Image!');
      setTimeout(() => setCopiedText(null), 1500);
    } catch (err) {
      console.error(err);
      await navigator.clipboard.writeText(asset.url);
      setCopiedText('Copied URL (Fallback)');
      setTimeout(() => setCopiedText(null), 1500);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 1500);
    } catch {}
  };

  return (
    <aside className="w-72 bg-[#161616] border-l border-zinc-800 overflow-y-auto flex flex-col flex-shrink-0 h-full select-none">
      <div className="p-4 border-b border-zinc-800">
        <div className="aspect-[16/10] checker-bg-dark rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-zinc-700/60">
          {!asset.url && (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800/40 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-zinc-700" />
            </div>
          )}
          {asset.url && (asset.type === 'image' || asset.type === 'vector') && (
            <img src={asset.url} alt={asset.name} className="max-h-64 max-w-full object-contain" />
          )}
          {asset.url && asset.type === 'video' && (
            <video src={asset.url} className="max-h-64 max-w-full object-contain bg-black" controls preload="metadata" />
          )}
          {asset.url && asset.type === 'audio' && (
            <div className="w-full flex flex-col items-center justify-center gap-3 p-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              {asset.url && <audio src={asset.url} controls className="w-full" />}
              {typeof asset.duration === 'number' && asset.duration > 0 && (
                <div className="text-[10px] text-zinc-500">{Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}</div>
              )}
            </div>
          )}
          {asset.type === 'pdf' && (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">PDF Document</span>
            </div>
          )}
          {asset.type === 'font' && (
            <div className="flex flex-col items-center justify-center gap-2 p-4">
              {/* Opacity-0 until fontFamily is loaded to prevent FOUC */}
              <span
                style={asset.fontFamily ? { fontFamily: `'${asset.fontFamily}', sans-serif` } : {}}
                className={`text-5xl font-bold text-violet-200 transition-opacity duration-300 ${asset.fontFamily ? 'opacity-100' : 'opacity-0'}`}
              >Aa</span>
              {asset.fontFamily && <span className="text-[10px] text-violet-400/70">{asset.fontFamily}</span>}
              <div
                style={asset.fontFamily ? { fontFamily: `'${asset.fontFamily}', sans-serif` } : {}}
                className={`text-[11px] text-zinc-400 mt-1 transition-opacity duration-300 ${asset.fontFamily ? 'opacity-100' : 'opacity-0'}`}
              >The quick brown fox</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
              if (event.key === 'Escape') { setDraftName(asset.name); event.currentTarget.blur(); }
            }}
            className="text-sm font-bold truncate text-zinc-100 border-none outline-none focus:ring-2 focus:ring-blue-500/30 rounded px-1 -ml-1 flex-1 bg-transparent"
            aria-label="Rename asset"
          />
          <button
            onClick={() => toggleStarred(asset.id)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-amber-400 transition-colors flex-shrink-0"
            aria-label={asset.starred ? 'Remove from starred' : 'Add to starred'}
          >
            <Star size={16} className={asset.starred ? 'text-amber-400 fill-amber-400' : ''} strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              {asset.name.split('.').pop()?.toUpperCase()}
            </span>
            <span className="text-[10px] text-zinc-500">{formatRelativeDate(asset.dateAdded)}</span>
          </div>
          <RatingStars value={asset.rating ?? 0} size={14} onChange={(r) => setAssetRating(asset.id, r)} />
        </div>
      </div>

      <div className="p-4 space-y-1 flex-1">
        <Section title="Details">
          <div className="grid grid-cols-[1fr_2fr] gap-y-2 text-[11px] items-center">
            <Row label="Size" value={formatBytes(asset.size)} />
            {(asset.width > 0 && asset.height > 0) && <Row label="Dimensions" value={`${asset.width} × ${asset.height}`} />}
            <Row label="Format" value={`${asset.name.split('.').pop()?.toUpperCase()} ${asset.type.charAt(0).toUpperCase()}${asset.type.slice(1)}`} />
            <Row label="Added" value={formatDate(asset.dateAdded).split(',')[0]} />
            {asset.deleted && asset.dateModified && (
              <Row label="Deleted" value={<span className="text-red-400">{formatRelativeDate(asset.dateModified)}</span>} />
            )}
            <Row
              label="Folder"
              value={
                <select
                  value={asset.folder ?? ''}
                  onChange={(event) => assignAssetsToFolder([asset.id], event.target.value || null)}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-[11px] text-zinc-200 outline-none"
                  aria-label="Asset folder"
                >
                  <option value="">No folder</option>
                  {folderNames.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                </select>
              }
            />
          </div>
        </Section>

        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {asset.tags.map(tag => (
              <span key={tag} className="group/tag px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-300 cursor-default hover:bg-zinc-800 transition-colors inline-flex items-center gap-1">
                <button onClick={() => { setActiveFolder('All'); setActiveTag(tag); }} className="hover:text-blue-400" aria-label={`Filter by ${tag}`}>
                  #{tag}
                </button>
                <button onClick={() => removeAssetTag(asset.id, tag)} className="hidden group-hover/tag:inline-flex text-zinc-500 hover:text-red-400 leading-none" aria-label={`Remove ${tag} tag`}>
                  ×
                </button>
              </span>
            ))}
            {isAddingTag ? (
              <div className="relative">
                <input
                  value={draftTag}
                  onChange={(event) => {
                    const val = event.target.value.replace(/^#/, '').toLowerCase();
                    setDraftTag(val);
                    const q = val.trim();
                    setTagSuggestions(
                      q.length === 0 ? [] :
                      allExistingTags.filter(t => t.startsWith(q) && !asset.tags.includes(t)).slice(0, 6)
                    );
                  }}
                  onBlur={() => {
                    // small delay so suggestion clicks register
                    setTimeout(() => { commitTag(); setTagSuggestions([]); }, 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') { event.preventDefault(); commitTag(); setTagSuggestions([]); }
                    if (event.key === 'Escape') { setDraftTag(''); setIsAddingTag(false); setTagSuggestions([]); }
                    if (event.key === 'Tab' && tagSuggestions.length > 0) {
                      event.preventDefault();
                      setDraftTag(tagSuggestions[0]);
                      setTagSuggestions([]);
                    }
                  }}
                  autoFocus
                  className="w-24 px-2 py-0.5 border border-blue-500/40 text-zinc-200 text-[10px] rounded outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-900 placeholder:text-zinc-600"
                  placeholder="tag…"
                />
                {tagSuggestions.length > 0 && (
                  <div className="panel-enter absolute left-0 top-6 z-50 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-0.5">
                    {tagSuggestions.map(s => (
                      <button
                        key={s}
                        onMouseDown={(e) => { e.preventDefault(); setDraftTag(s); setTagSuggestions([]); }}
                        className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        #{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => { setIsAddingTag(true); setTagSuggestions([]); }} className="px-2 py-0.5 border border-dashed border-zinc-600 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 text-[10px] rounded cursor-pointer transition-colors bg-zinc-900/50">
                + Add
              </button>
            )}
          </div>
        </Section>

        <Section title="Note">
          <textarea
            value={draftNote}
            onChange={(event) => {
              const val = event.target.value;
              setDraftNote(val);
              if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
              noteDebounceRef.current = setTimeout(() => {
                noteDebounceRef.current = null;
                setAssetNote(asset.id, val);
              }, 600);
            }}
            onBlur={commitNote}
            rows={3}
            placeholder="Add a note…"
            className="w-full resize-none rounded-lg border border-transparent bg-zinc-900 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-200 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600 transition-colors"
          />
        </Section>

        {asset.type === 'image' && (
          <Section
            title="Color Palette"
            action={
              asset.colors.length === 0 && asset.storage !== 'indexeddb' ? (
                <span className="group relative inline-flex items-center text-zinc-600 cursor-default">
                  <Info size={11} />
                  <span className="pointer-events-none absolute right-0 top-5 z-50 w-52 rounded-lg bg-zinc-900 border border-zinc-700 px-2.5 py-2 text-[10px] text-zinc-400 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity leading-relaxed">
                    Palette extraction failed. The image may be hosted on a server that blocks cross-origin requests (CORS).
                  </span>
                </span>
              ) : undefined
            }
          >
            {asset.colors.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {asset.colors.map(color => (
                  <button
                    key={color}
                    onClick={() => void copyColor(color)}
                    className="group/color relative h-6 w-6 rounded-md shadow-sm border border-zinc-700/60 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    style={{ backgroundColor: color }}
                    title={`Copy ${color}`}
                    aria-label={`Copy ${color}`}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[9px] font-mono font-medium text-white opacity-0 shadow transition-opacity group-hover/color:opacity-100">
                      {copiedColor === color ? '✓ Copied' : color}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-600 italic">No palette available</p>
            )}
          </Section>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-zinc-800 space-y-2">
        {asset.deleted || activeFolder === 'Trash' ? (
          <>
            <button onClick={() => restoreAssets([asset.id])} className="w-full py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <RotateCcw size={14} /> Restore
            </button>
            <button onClick={() => deleteAssetsPermanently([asset.id])} className="w-full py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <XCircle size={14} /> Delete Permanently
            </button>
          </>
        ) : (
          <>
            <button onClick={() => window.open(asset.url, '_blank', 'noopener,noreferrer')} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors">
              View Full Resolution
            </button>
            {(asset.type === 'image' || asset.type === 'vector') && (
              <button onClick={handleCopyImage} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Clipboard size={14} /> {copiedText === 'Copied Image!' || copiedText === 'Copied URL (Fallback)' ? copiedText : 'Copy Image'}
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleCopyText(asset.name, 'Copied Name!')} className="flex-1 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                <Copy size={13} /> {copiedText === 'Copied Name!' ? 'Copied!' : 'Copy Name'}
              </button>
              <button onClick={() => handleCopyText(asset.url, 'Copied URL!')} className="flex-1 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                <Copy size={13} /> {copiedText === 'Copied URL!' ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <button onClick={downloadAsset} className="w-full py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Download size={14} /> Download
            </button>
            <button onClick={() => deleteAssets([asset.id])} className="w-full py-2 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
