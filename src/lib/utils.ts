import { COLOR_BUCKETS } from '../types';

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(navigator.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeDate(dateString: string) {
  const date = new Date(dateString).getTime();
  const now = Date.now();
  const diff = now - date;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateString));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

/** Squared euclidean distance between two RGB triples. */
function colorDistanceSq(a: [number, number, number], b: [number, number, number]) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** Maps a hex color to the nearest named color bucket. */
export function nearestColorBucket(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let bestName: string | null = null;
  let bestDistance = Infinity;
  for (const bucket of COLOR_BUCKETS) {
    const distance = colorDistanceSq(rgb, bucket.rgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = bucket.name;
    }
  }
  return bestName;
}

/** Returns true when any of the asset's palette colors fall into the given bucket. */
export function assetMatchesColorBucket(colors: string[], bucketName: string): boolean {
  return colors.some(color => nearestColorBucket(color) === bucketName);
}
