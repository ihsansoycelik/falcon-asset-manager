export type AssetType = 'image' | 'video' | 'vector' | 'audio' | 'pdf' | 'font';

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: AssetType;
  width: number;
  height: number;
  size: number; // bytes
  tags: string[];
  colors: string[];
  dateAdded: string;
  dateModified?: string;
  starred: boolean;
  deleted: boolean;
  rating?: number; // 0-5
  note?: string;
  folder?: string;
  storage?: 'remote' | 'indexeddb';
  // Color label for visual organization (uses COLOR_BUCKET names)
  label?: string;
  // For audio: duration in seconds
  duration?: number;
  // For fonts: detected font family name
  fontFamily?: string;
  // SHA-256 fingerprint of first 64 KB — used for duplicate detection
  fingerprint?: string;
  // Base64 data-URL of annotation SVG path drawn on top of the image
  annotationDataUrl?: string;
}

export type ViewMode = 'grid' | 'masonry' | 'list';

export type SortBy = 'name' | 'dateAdded' | 'size' | 'dimensions' | 'rating';

export type SortOrder = 'asc' | 'desc';

export type Orientation = 'all' | 'landscape' | 'portrait' | 'square';

export type SmartFolderRuleField = 'tag' | 'type' | 'rating' | 'starred';
export type SmartFolderRuleOp = 'is' | 'gte';

export interface SmartFolderRule {
  field: SmartFolderRuleField;
  op: SmartFolderRuleOp;
  value: string;
}

export interface SmartFolder {
  id: string;
  name: string;
  rules: SmartFolderRule[];
  matchAll: boolean; // true = AND, false = OR
}

/** Named color buckets used for the Eagle-style color filter strip. */
export const COLOR_BUCKETS: Array<{ name: string; hex: string; rgb: [number, number, number] }> = [
  { name: 'Red', hex: '#ef4444', rgb: [239, 68, 68] },
  { name: 'Orange', hex: '#f97316', rgb: [249, 115, 22] },
  { name: 'Yellow', hex: '#eab308', rgb: [234, 179, 8] },
  { name: 'Green', hex: '#22c55e', rgb: [34, 197, 94] },
  { name: 'Teal', hex: '#14b8a6', rgb: [20, 184, 166] },
  { name: 'Blue', hex: '#3b82f6', rgb: [59, 130, 246] },
  { name: 'Purple', hex: '#a855f7', rgb: [168, 85, 247] },
  { name: 'Pink', hex: '#ec4899', rgb: [236, 72, 153] },
  { name: 'Brown', hex: '#92400e', rgb: [146, 64, 14] },
  { name: 'White', hex: '#f8fafc', rgb: [248, 250, 252] },
  { name: 'Gray', hex: '#71717a', rgb: [113, 113, 122] },
  { name: 'Black', hex: '#18181b', rgb: [24, 24, 27] },
];
