import React, { useEffect, useState } from 'react';
import {
  Folder, FolderOpen, Image as ImageIcon, Video, FileQuestion,
  Trash2, Star, Clock, Plus, Music, FileText, Type,
  Zap, Shuffle, Edit2, X, ChevronRight, Lock, Unlock
} from 'lucide-react';
import { createFolderId, useStore } from '../store/AssetContext';
import { SmartFolderRule, SmartFolderRuleField } from '../types';

type SidebarIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

type FolderNode = {
  name: string;
  fullPath: string;
  children: FolderNode[];
  assetCount: number;
};

function buildFolderTree(folderNames: string[], visibleAssets: { folder?: string }[]): FolderNode[] {
  const roots: FolderNode[] = [];
  const nodeMap = new Map<string, FolderNode>();

  const sorted = [...folderNames].sort();
  for (const fullPath of sorted) {
    const segments = fullPath.split('/');
    const name = segments[segments.length - 1];
    // Skip invalid paths with empty segments (e.g. "Design/")
    if (!name || segments.some(s => !s)) continue;
    const parentPath = segments.slice(0, -1).join('/');
    // Count assets in this folder AND all subfolders (for badge)
    const count = visibleAssets.filter(a =>
      a.folder === fullPath || a.folder?.startsWith(fullPath + '/')
    ).length;
    const node: FolderNode = { name, fullPath, children: [], assetCount: count };
    nodeMap.set(fullPath, node);
    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

type NavItemProps = {
  icon: SidebarIcon;
  label: string;
  id: string;
  count?: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent) => void;
  isDropTarget?: boolean;
  iconClassName?: string;
};

function NavItem({ icon: Icon, label, id, count, isActive, onSelect, onContextMenu, onDragOver, onDragLeave, onDrop, isDropTarget, iconClassName }: NavItemProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-default ${
        isDropTarget ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
          : isActive ? 'bg-zinc-700 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={14} className={`flex-shrink-0 ${iconClassName ?? (isActive ? 'text-zinc-200' : 'text-zinc-500')}`} strokeWidth={2} />
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && (
        <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none ${isActive ? 'bg-white/15 text-zinc-300' : 'bg-zinc-800 text-zinc-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 mt-6 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
      {children}
    </div>
  );
}

function SmartFolderEditor({ initial, onSave, onCancel }: {
  initial?: { name: string; rules: SmartFolderRule[]; matchAll: boolean };
  onSave: (name: string, rules: SmartFolderRule[], matchAll: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [rules, setRules] = useState<SmartFolderRule[]>(initial?.rules ?? [{ field: 'tag', op: 'is', value: '' }]);
  const [matchAll, setMatchAll] = useState(initial?.matchAll ?? true);
  const addRule = () => setRules(p => [...p, { field: 'tag', op: 'is', value: '' }]);
  const removeRule = (i: number) => setRules(p => p.filter((_, idx) => idx !== i));
  const updateRule = (i: number, patch: Partial<SmartFolderRule>) =>
    setRules(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  return (
    <div className="mx-2 mb-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-[11px] space-y-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name…"
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600" autoFocus />
      <div className="flex items-center gap-2 text-zinc-500">
        <span>Match</span>
        <button onClick={() => setMatchAll(v => !v)} className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">{matchAll ? 'all' : 'any'}</button>
        <span>rules</span>
      </div>
      {rules.map((rule, i) => (
        <div key={i} className="flex flex-col gap-1.5 border-b border-zinc-800 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
          <div className="flex items-center gap-1">
            <select value={rule.field} onChange={e => {
              const nextField = e.target.value as SmartFolderRuleField;
              let defaultValue = '';
              if (nextField === 'starred' || nextField === 'has_note') defaultValue = 'true';
              else if (nextField === 'type') defaultValue = 'image';
              else if (nextField === 'rating') defaultValue = '1';
              else if (nextField === 'date_added') defaultValue = '7days';
              else if (nextField === 'size') defaultValue = 'gt:1:MB';
              updateRule(i, { field: nextField, value: defaultValue });
            }} className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
              <option value="tag">Tag</option>
              <option value="type">Type</option>
              <option value="rating">Rating ≥</option>
              <option value="starred">Starred</option>
              <option value="name_contains">Name contains</option>
              <option value="date_added">Date added within</option>
              <option value="size">File size</option>
              <option value="has_note">Has note</option>
              <option value="folder_contains">Folder path contains</option>
            </select>
            <button onClick={() => removeRule(i)} className="text-zinc-600 hover:text-red-400 flex-shrink-0 ml-1"><X size={12} /></button>
          </div>
          <div className="flex items-center gap-1 pl-1">
            {rule.field === 'starred' ? (
              <select value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            ) : rule.field === 'has_note' ? (
              <select value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                <option value="true">Yes</option><option value="false">No</option>
              </select>
            ) : rule.field === 'type' ? (
              <select value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                <option value="image">Image</option><option value="video">Video</option>
                <option value="vector">Vector</option><option value="audio">Audio</option>
                <option value="pdf">PDF</option><option value="font">Font</option>
              </select>
            ) : rule.field === 'rating' ? (
              <select value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                {[1,2,3,4,5].map(n => <option key={n} value={String(n)}>{n}+</option>)}
              </select>
            ) : rule.field === 'date_added' ? (() => {
              const isCustom = rule.value.startsWith('custom:');
              const presetValue = isCustom ? 'custom' : rule.value;
              let startDate = '';
              let endDate = '';
              if (isCustom) {
                const parts = rule.value.split(':');
                startDate = parts[1] || '';
                endDate = parts[2] || '';
              }
              return (
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <select value={presetValue} onChange={e => {
                    if (e.target.value === 'custom') {
                      const todayStr = new Date().toISOString().split('T')[0];
                      updateRule(i, { value: `custom:${todayStr}:${todayStr}` });
                    } else {
                      updateRule(i, { value: e.target.value });
                    }
                  }} className="w-full rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="this_month">This month</option>
                    <option value="custom">Custom range…</option>
                  </select>
                  {isCustom && (
                    <div className="flex items-center gap-1 mt-1">
                      <input type="date" value={startDate} onChange={e => updateRule(i, { value: `custom:${e.target.value}:${endDate}` })}
                        className="w-[85px] rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[9px]" />
                      <span className="text-zinc-600 text-[9px]">to</span>
                      <input type="date" value={endDate} onChange={e => updateRule(i, { value: `custom:${startDate}:${e.target.value}` })}
                        className="w-[85px] rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[9px]" />
                    </div>
                  )}
                </div>
              );
            })() : rule.field === 'size' ? (() => {
              const parts = rule.value.split(':');
              const comp = parts[0] || 'gt';
              const valStr = parts[1] || '1';
              const unit = parts[2] || 'MB';
              return (
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <select value={comp} onChange={e => updateRule(i, { value: `${e.target.value}:${valStr}:${unit}` })}
                    className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px] min-w-8">
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                  </select>
                  <input type="number" min="0" value={valStr} onChange={e => updateRule(i, { value: `${comp}:${e.target.value}:${unit}` })}
                    className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px] min-w-0 flex-1" />
                  <select value={unit} onChange={e => updateRule(i, { value: `${comp}:${valStr}:${e.target.value}` })}
                    className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-zinc-300 outline-none text-[10px]">
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
              );
            })() : rule.field === 'name_contains' ? (
              <input value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} placeholder="name contains…"
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300 outline-none placeholder:text-zinc-600 min-w-0 text-[10px]" />
            ) : rule.field === 'folder_contains' ? (
              <input value={rule.value} onChange={e => updateRule(i, { value: e.target.value })} placeholder="folder starts with…"
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300 outline-none placeholder:text-zinc-600 min-w-0 text-[10px]" />
            ) : (
              <input value={rule.value} onChange={e => updateRule(i, { value: e.target.value.replace(/^#/, '').toLowerCase() })} placeholder="value…"
                className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300 outline-none placeholder:text-zinc-600 min-w-0 text-[10px]" />
            )}
          </div>
        </div>
      ))}
      <button onClick={addRule} className="text-zinc-500 hover:text-zinc-300 text-[10px]">+ Add rule</button>
      <div className="flex gap-2 pt-1">
        <button onClick={() => { if (name.trim()) onSave(name.trim(), rules.filter(r => r.value.trim()), matchAll); }}
          disabled={!name.trim()}
          className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-[10px] font-semibold">Save</button>
        <button onClick={onCancel} className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]">Cancel</button>
      </div>
    </div>
  );
}

// Recursive folder tree node
function FolderTreeNode({
  node, depth, activeFolder, renamingFolder, draftRename, dropTargetFolder,
  onSelect, onContextMenu, onRenameChange, onRenameCommit, onRenameKeyDown,
  onDragOver, onDragLeave, onDrop,
  expandedFolders, toggleExpanded,
}: {
  node: FolderNode; depth: number; activeFolder: string;
  renamingFolder: string | null; draftRename: string; dropTargetFolder: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, folder: string) => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  onDragOver: (e: React.DragEvent, folder: string) => void;
  onDragLeave: (folder: string) => void;
  onDrop: (e: React.DragEvent, folder: string) => void;
  expandedFolders: Set<string>;
  toggleExpanded: (path: string) => void;
}) {
  const folderId = createFolderId(node.fullPath);
  const isActive = activeFolder === folderId;
  const isDropTarget = dropTargetFolder === node.fullPath;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.fullPath);

  if (renamingFolder === node.fullPath) {
    return (
      <input
        value={draftRename}
        onChange={e => onRenameChange(e.target.value)}
        onBlur={onRenameCommit}
        onKeyDown={onRenameKeyDown}
        autoFocus
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="mx-2 mb-1 w-[calc(100%-1rem)] rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    );
  }

  return (
    <div>
      <div
        className={`group flex items-center rounded-md text-xs font-medium transition-colors cursor-default mx-0 ${
          isDropTarget ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
            : isActive ? 'bg-zinc-700 text-white'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
        style={{ paddingLeft: `${depth * 12 + 2}px` }}
      >
        <button
          onClick={() => hasChildren && toggleExpanded(node.fullPath)}
          className={`flex-shrink-0 w-4 h-6 flex items-center justify-center ${hasChildren ? 'cursor-default' : 'cursor-default opacity-0'}`}
          tabIndex={-1}
        >
          {hasChildren && (
            <ChevronRight size={11} className={`text-zinc-500 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
          )}
        </button>
        <button
          onClick={() => onSelect(folderId)}
          onContextMenu={e => onContextMenu(e, node.fullPath)}
          onDragOver={e => onDragOver(e, node.fullPath)}
          onDragLeave={() => onDragLeave(node.fullPath)}
          onDrop={e => onDrop(e, node.fullPath)}
          className="flex flex-1 min-w-0 items-center gap-1.5 py-1.5 pr-2"
        >
          {isActive
            ? <FolderOpen size={14} className="flex-shrink-0 text-zinc-200" strokeWidth={2} />
            : <Folder size={14} className="flex-shrink-0 text-zinc-500" strokeWidth={2} />}
          <span className="truncate">{node.name}</span>
          <span className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none ${isActive ? 'bg-white/15 text-zinc-300' : 'bg-zinc-800 text-zinc-600'}`}>
            {node.assetCount}
          </span>
        </button>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              renamingFolder={renamingFolder}
              draftRename={draftRename}
              dropTargetFolder={dropTargetFolder}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameKeyDown={onRenameKeyDown}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              expandedFolders={expandedFolders}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const {
    assets, activeFolder, setActiveFolder, activeTag, setActiveTag,
    folderNames, createFolder, renameFolder, deleteFolder, assignAssetsToFolder,
    smartFolders, createSmartFolder, updateSmartFolder, deleteSmartFolder,
    selectRandomAsset,
  } = useStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [draftFolderName, setDraftFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [draftRename, setDraftRename] = useState('');
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; folder: string } | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [isCreatingSmartFolder, setIsCreatingSmartFolder] = useState(false);
  const [editingSmartFolderId, setEditingSmartFolderId] = useState<string | null>(null);
  const [smartFolderMenu, setSmartFolderMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Library lock state — PIN stored as a lightweight hash in localStorage
  const [isLocked, setIsLocked] = useState(() => {
    // Always start locked on page load if a PIN exists.
    // Previously also required 'falcon_locked' === 'true', which let anyone
    // bypass by deleting that key in DevTools and reloading. Now the PIN hash
    // itself ('falcon_lock_pin') is the single source of truth for lock state.
    return !!localStorage.getItem('falcon_lock_pin');
  });
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [lockError, setLockError] = useState('');
  const hasPin = !!localStorage.getItem('falcon_lock_pin');

  const hashPin = async (pin: string) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSetPin = async () => {
    if (lockPin.length < 4) { setLockError('PIN must be at least 4 characters'); return; }
    const hash = await hashPin(lockPin);
    localStorage.setItem('falcon_lock_pin', hash);
    localStorage.setItem('falcon_locked', 'true');
    setIsLocked(true);
    setShowLockSetup(false);
    setLockPin('');
    setLockError('');
  };

  const handleUnlock = async () => {
    const stored = localStorage.getItem('falcon_lock_pin');
    if (!stored) return;
    const hash = await hashPin(unlockPin);
    if (hash === stored) {
      localStorage.removeItem('falcon_locked');
      setIsLocked(false);
      setUnlockPin('');
      setLockError('');
    } else {
      setLockError('Incorrect PIN');
      setUnlockPin('');
    }
  };

  const handleLockNow = () => {
    if (!hasPin) { setShowLockSetup(true); return; }
    localStorage.setItem('falcon_locked', 'true');
    setIsLocked(true);
  };

  const handleRemoveLock = async () => {
    const stored = localStorage.getItem('falcon_lock_pin');
    if (!stored) return;
    const hash = await hashPin(lockPin);
    if (hash === stored) {
      localStorage.removeItem('falcon_lock_pin');
      localStorage.removeItem('falcon_locked');
      setShowLockSetup(false);
      setLockPin('');
      setLockError('');
    } else {
      setLockError('Incorrect PIN');
    }
  };

  const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const visibleAssets = assets.filter(a => !a.deleted);
  const allTags = Array.from(new Set(visibleAssets.flatMap(a => a.tags))).sort();
  const counts = {
    all: visibleAssets.length,
    recent: visibleAssets.filter(a => new Date(a.dateAdded).getTime() >= recentThreshold).length,
    starred: visibleAssets.filter(a => a.starred).length,
    images: visibleAssets.filter(a => a.type === 'image').length,
    vectors: visibleAssets.filter(a => a.type === 'vector').length,
    videos: visibleAssets.filter(a => a.type === 'video').length,
    audio: visibleAssets.filter(a => a.type === 'audio').length,
    pdfs: visibleAssets.filter(a => a.type === 'pdf').length,
    fonts: visibleAssets.filter(a => a.type === 'font').length,
    trash: assets.filter(a => a.deleted).length,
  };

  const folderTree = buildFolderTree(folderNames, visibleAssets);

  const toggleExpanded = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFolderSelect = (id: string) => {
    setActiveFolder(id);
    setActiveTag(null);
  };

  useEffect(() => {
    const close = () => { setFolderMenu(null); setSmartFolderMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const commitFolder = () => {
    const name = draftFolderName.trim();
    if (name) {
      createFolder(name);
      setActiveFolder(createFolderId(name));
      setActiveTag(null);
      // Auto-expand parent if creating a nested folder
      const parent = name.split('/').slice(0, -1).join('/');
      if (parent) setExpandedFolders(prev => new Set([...prev, parent]));
    }
    setDraftFolderName('');
    setIsCreatingFolder(false);
  };

  const commitRenameFolder = () => {
    if (renamingFolder) renameFolder(renamingFolder, draftRename);
    setRenamingFolder(null);
    setDraftRename('');
  };

  const getDraggedAssetIds = (event: React.DragEvent) => {
    try {
      // Primary format — all modern browsers
      const json = event.dataTransfer.getData('application/x-falcon-asset-ids');
      if (json) return JSON.parse(json) as string[];
      // Fallback for Firefox, which may only expose text/plain on drop
      const plain = event.dataTransfer.getData('text/plain');
      if (plain) return plain.split(',').filter(Boolean);
      return [];
    } catch { return []; }
  };

  const activeFolderLabel = (() => {
    if (activeFolder === 'Trash') return `${counts.trash} in Trash`;
    if (activeFolder === 'Starred') return `${counts.starred} starred`;
    if (activeFolder === 'Recent') return `${counts.recent} recent`;
    if (activeFolder === 'Images') return `${counts.images} image${counts.images !== 1 ? 's' : ''}`;
    if (activeFolder === 'Vectors') return `${counts.vectors} vector${counts.vectors !== 1 ? 's' : ''}`;
    if (activeFolder === 'Videos') return `${counts.videos} video${counts.videos !== 1 ? 's' : ''}`;
    if (activeFolder === 'Audio') return `${counts.audio} audio`;
    return `${counts.all} ${counts.all === 1 ? 'item' : 'items'}`;
  })();

  // Lock screen overlay
  if (isLocked) {
    return (
      <div className="w-64 flex-shrink-0 bg-[#161616] border-r border-zinc-800 flex flex-col items-center justify-center h-full select-none p-6 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-2">
          <Lock size={24} className="text-zinc-400" />
        </div>
        <div className="text-sm font-semibold text-zinc-200 text-center">Library Locked</div>
        <div className="text-[11px] text-zinc-500 text-center">Enter your PIN to unlock</div>
        <input
          type="password"
          value={unlockPin}
          onChange={e => { setUnlockPin(e.target.value); setLockError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') void handleUnlock(); }}
          placeholder="PIN"
          autoFocus
          maxLength={12}
          className="w-full text-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-zinc-600 tracking-[0.3em]"
        />
        {lockError && <div className="text-[11px] text-red-400">{lockError}</div>}
        <button
          onClick={() => void handleUnlock()}
          disabled={!unlockPin}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-[#161616] border-r border-zinc-800 flex flex-col h-full select-none">
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded bg-white flex-shrink-0">
          <svg width="9" height="10" viewBox="0 0 9 10" fill="none">
            <path d="M1.5 1L8 5L1.5 9V1Z" fill="#141414"/>
          </svg>
        </div>
        <span className="text-[13px] font-semibold text-zinc-100 tracking-tight">Falcon</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => selectRandomAsset()} className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-amber-400 transition-colors" title="Random asset (Explore)">
            <Shuffle size={12} />
          </button>
          <button
            onClick={handleLockNow}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            title={hasPin ? 'Lock library' : 'Set up library lock'}
          >
            <Lock size={12} />
          </button>
        </div>
      </div>

      {/* Lock setup modal */}
      {showLockSetup && (
        <div className="mx-4 mt-4 p-4 rounded-xl border border-zinc-700 bg-zinc-900 space-y-3">
          <div className="text-xs font-semibold text-zinc-200">
            {hasPin ? 'Remove lock — enter current PIN' : 'Set up a PIN to lock your library'}
          </div>
          {!hasPin && (
            <p className="text-[10px] text-amber-500/80 leading-relaxed">
              Casual deterrent only. Anyone with browser DevTools can bypass by deleting the <code className="font-mono">falcon_lock_pin</code> key (this also clears your PIN) or brute-forcing a short PIN. Do not rely on this to protect sensitive assets.
            </p>
          )}
          <input
            type="password"
            value={lockPin}
            onChange={e => { setLockPin(e.target.value); setLockError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') hasPin ? void handleRemoveLock() : void handleSetPin(); }}
            placeholder="Enter PIN (min. 4 chars)"
            autoFocus
            maxLength={12}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600"
          />
          {lockError && <div className="text-[10px] text-red-400">{lockError}</div>}
          <div className="flex gap-2">
            <button
              onClick={() => hasPin ? void handleRemoveLock() : void handleSetPin()}
              disabled={!lockPin}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-[10px] font-semibold transition-colors"
            >
              {hasPin ? 'Remove Lock' : 'Set PIN & Lock'}
            </button>
            <button onClick={() => { setShowLockSetup(false); setLockPin(''); setLockError(''); }}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="sidebar-scroll flex-1 overflow-y-auto px-4 space-y-0.5 pt-4 pb-8">
        <NavItem id="All" icon={Folder} label="All Items" count={counts.all} isActive={activeFolder === 'All' && !activeTag} onSelect={handleFolderSelect} />
        <NavItem id="Recent" icon={Clock} label="Recent" count={counts.recent} isActive={activeFolder === 'Recent' && !activeTag} onSelect={handleFolderSelect} />
        <NavItem id="Starred" icon={Star} label="Starred" count={counts.starred} isActive={activeFolder === 'Starred' && !activeTag} onSelect={handleFolderSelect} />

        <SectionTitle>Libraries</SectionTitle>
        <NavItem id="Images" icon={ImageIcon} label="Images" count={counts.images} isActive={activeFolder === 'Images' && !activeTag} onSelect={handleFolderSelect} />
        <NavItem id="Vectors" icon={FileQuestion} label="Vectors" count={counts.vectors} isActive={activeFolder === 'Vectors' && !activeTag} onSelect={handleFolderSelect} />
        <NavItem id="Videos" icon={Video} label="Videos" count={counts.videos} isActive={activeFolder === 'Videos' && !activeTag} onSelect={handleFolderSelect} />
        {counts.audio > 0 && <NavItem id="Audio" icon={Music} label="Audio" count={counts.audio} isActive={activeFolder === 'Audio' && !activeTag} onSelect={handleFolderSelect} iconClassName="text-emerald-500" />}
        {counts.pdfs > 0 && <NavItem id="PDFs" icon={FileText} label="PDFs" count={counts.pdfs} isActive={activeFolder === 'PDFs' && !activeTag} onSelect={handleFolderSelect} iconClassName="text-red-400" />}
        {counts.fonts > 0 && <NavItem id="Fonts" icon={Type} label="Fonts" count={counts.fonts} isActive={activeFolder === 'Fonts' && !activeTag} onSelect={handleFolderSelect} iconClassName="text-violet-400" />}

        {/* Smart Folders */}
        <div className="flex items-center justify-between pr-1">
          <SectionTitle>Smart Folders</SectionTitle>
          <button onClick={() => { setIsCreatingSmartFolder(true); setEditingSmartFolderId(null); }}
            className="mt-6 mb-2 flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors" title="Create smart folder">
            <Plus size={13} />
          </button>
        </div>
        {isCreatingSmartFolder && !editingSmartFolderId && (
          <SmartFolderEditor onSave={(name, rules, matchAll) => { createSmartFolder(name, rules, matchAll); setIsCreatingSmartFolder(false); }} onCancel={() => setIsCreatingSmartFolder(false)} />
        )}
        {smartFolders.map(sf => (
          <React.Fragment key={sf.id}>
            {editingSmartFolderId === sf.id ? (
              <SmartFolderEditor
                initial={sf}
                onSave={(name, rules, matchAll) => { updateSmartFolder(sf.id, name, rules, matchAll); setEditingSmartFolderId(null); }}
                onCancel={() => setEditingSmartFolderId(null)}
              />
            ) : (
              <NavItem id={sf.id} icon={Zap} label={sf.name} isActive={activeFolder === sf.id && !activeTag} onSelect={handleFolderSelect} iconClassName="text-amber-400"
                onContextMenu={e => { e.preventDefault(); setSmartFolderMenu({ x: Math.max(8, Math.min(e.clientX, window.innerWidth - 184)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 80)), id: sf.id }); }} />
            )}
          </React.Fragment>
        ))}

        {/* Nested Folders */}
        <div className="flex items-center justify-between pr-1">
          <SectionTitle>Folders</SectionTitle>
          <button onClick={() => setIsCreatingFolder(true)}
            className="mt-6 mb-2 flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors" title="Create folder">
            <Plus size={13} />
          </button>
        </div>
        {isCreatingFolder && (
          <input
            value={draftFolderName}
            onChange={e => setDraftFolderName(e.target.value)}
            onBlur={commitFolder}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitFolder(); }
              if (e.key === 'Escape') { setDraftFolderName(''); setIsCreatingFolder(false); }
            }}
            autoFocus
            className="mx-2 mb-1 w-[calc(100%-1rem)] rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-600"
            placeholder="Name or Parent/Child"
          />
        )}
        {folderTree.map(node => (
          <FolderTreeNode
            key={node.fullPath}
            node={node}
            depth={0}
            activeFolder={activeFolder}
            renamingFolder={renamingFolder}
            draftRename={draftRename}
            dropTargetFolder={dropTargetFolder}
            onSelect={handleFolderSelect}
            onContextMenu={(e, folder) => {
              e.preventDefault();
              setFolderMenu({ x: Math.max(8, Math.min(e.clientX, window.innerWidth - 200)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 140)), folder });
            }}
            onRenameChange={setDraftRename}
            onRenameCommit={commitRenameFolder}
            onRenameKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitRenameFolder(); }
              if (e.key === 'Escape') { setRenamingFolder(null); setDraftRename(''); }
            }}
            onDragOver={(e, folder) => {
              // Firefox exposes type names during dragover; other browsers may not.
              // Accept if either the custom type or plain text (our fallback) is present.
              const types = Array.from(e.dataTransfer.types);
              if (!types.includes('application/x-falcon-asset-ids') && !types.includes('text/plain')) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropTargetFolder(folder);
            }}
            onDragLeave={folder => setDropTargetFolder(cur => cur === folder ? null : cur)}
            onDrop={(e, folder) => {
              e.preventDefault();
              const ids = getDraggedAssetIds(e);
              if (ids.length > 0) assignAssetsToFolder(ids, folder);
              setDropTargetFolder(null);
            }}
            expandedFolders={expandedFolders}
            toggleExpanded={toggleExpanded}
          />
        ))}

        <SectionTitle>Tags</SectionTitle>
        <div className="px-2 flex flex-wrap gap-1">
          {allTags.map(tag => {
            const isActive = activeTag === tag;
            return (
              <button key={tag} onClick={() => setActiveTag(isActive ? null : tag)}
                className={`px-2 py-0.5 border rounded text-[10px] transition-colors cursor-default ${isActive ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-medium' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'}`}>
                #{tag}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <NavItem id="Trash" icon={Trash2} label="Trash" count={counts.trash} isActive={activeFolder === 'Trash' && !activeTag} onSelect={handleFolderSelect} />
        </div>

        {/* Lock management when unlocked */}
        {hasPin && !showLockSetup && (
          <div className="mt-4 px-2">
            <button onClick={() => { setShowLockSetup(true); setLockPin(''); setLockError(''); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors">
              <Unlock size={11} /> Manage lock…
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-[10px] text-zinc-600">
        <span>{activeFolderLabel}</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-[9px] font-semibold text-zinc-400">⌘/</kbd>
          shortcuts
        </span>
      </div>

      {folderMenu && (
        <div className="fixed z-50 w-52 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 py-1 text-xs text-zinc-200 shadow-xl shadow-black/40"
          style={{ left: folderMenu.x, top: folderMenu.y }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRenamingFolder(folderMenu.folder); setDraftRename(folderMenu.folder.split('/').pop() ?? folderMenu.folder); setFolderMenu(null); }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-600/60 transition-colors flex items-center gap-2">
            <Edit2 size={12} /> Rename
          </button>
          <button onClick={() => {
            // Create a subfolder: pre-fill with "Parent/" prefix
            setDraftFolderName(folderMenu.folder + '/');
            setIsCreatingFolder(true);
            // Expand this folder so the new child will be visible
            setExpandedFolders(prev => new Set([...prev, folderMenu.folder]));
            setFolderMenu(null);
          }} className="w-full px-3 py-2 text-left hover:bg-zinc-600/60 transition-colors flex items-center gap-2">
            <Plus size={12} /> New Subfolder
          </button>
          <div className="my-1 border-t border-zinc-700" />
          <button onClick={() => { deleteFolder(folderMenu.folder); setFolderMenu(null); }}
            className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/15 transition-colors">
            Delete Folder
          </button>
        </div>
      )}

      {smartFolderMenu && (
        <div className="fixed z-50 w-44 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 py-1 text-xs text-zinc-200 shadow-xl shadow-black/40"
          style={{ left: smartFolderMenu.x, top: smartFolderMenu.y }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setEditingSmartFolderId(smartFolderMenu.id); setSmartFolderMenu(null); }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-600/60 transition-colors flex items-center gap-2">
            <Edit2 size={12} /> Edit Rules
          </button>
          <button onClick={() => { deleteSmartFolder(smartFolderMenu.id); setSmartFolderMenu(null); }}
            className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/15 transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
}
