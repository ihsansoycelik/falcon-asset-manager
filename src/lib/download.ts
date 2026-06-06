import { Asset } from '../types';

export const downloadAssetFile = (asset: Asset) => {
  const link = document.createElement('a');
  link.href = asset.url;
  link.download = asset.name;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const exportAssetsAsZip = async (assets: Asset[]) => {
  const entries = await Promise.all(assets.map(async asset => {
    const response = await fetch(asset.url);
    const data = new Uint8Array(await response.arrayBuffer());
    return {
      name: uniqueZipName(asset.name, assets),
      data,
      modifiedAt: asset.dateModified ? new Date(asset.dateModified) : new Date(asset.dateAdded),
    };
  }));

  const blob = new Blob([createStoredZip(entries)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `falcon-assets-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const uniqueZipName = (name: string, assets: Asset[]) => {
  const duplicateCount = assets.filter(asset => asset.name === name).length;
  if (duplicateCount === 1) return name;

  const dotIndex = name.lastIndexOf('.');
  const suffix = `-${crypto.randomUUID().slice(0, 8)}`;
  return dotIndex > 0
    ? `${name.slice(0, dotIndex)}${suffix}${name.slice(dotIndex)}`
    : `${name}${suffix}`;
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
  modifiedAt: Date;
};

const createStoredZip = (entries: ZipEntry[]) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach(entry => {
    const fileName = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const { dosDate, dosTime } = getDosDateTime(entry.modifiedAt);
    const localHeader = new Uint8Array(30 + fileName.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, fileName.length, true);
    localHeader.set(fileName, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + fileName.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, fileName.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(fileName, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);

  return concatUint8Arrays([...localParts, ...centralParts, endRecord]);
};

const concatUint8Arrays = (parts: Uint8Array[]) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach(part => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const getDosDateTime = (date: Date) => {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
};

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = crcTable[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
