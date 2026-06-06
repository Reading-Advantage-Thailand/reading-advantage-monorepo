/**
 * Minimal ZIP archive builder (STORE method, no compression).
 *
 * Creates a valid ZIP file from a list of named Uint8Array entries.
 * Only used for DSAR export where the test checks PK magic bytes.
 */

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_HEADER_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
}

export function buildMinimalZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const entries: ZipEntry[] = [];
  let offset = 0;

  // Local file headers + data
  const parts: Uint8Array[] = [];
  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const header = new ArrayBuffer(30 + nameBytes.length);
    const view = new DataView(header);
    const arr = new Uint8Array(header);

    view.setUint32(0, LOCAL_FILE_HEADER_SIG, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    const fileCrc = crc32(file.data);
    view.setUint32(14, fileCrc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    arr.set(nameBytes, 30);

    entries.push({
      name: nameBytes,
      data: file.data,
      crc: fileCrc,
      offset,
    });

    parts.push(arr);
    parts.push(file.data);
    offset += header.byteLength + file.data.length;
  }

  // Central directory
  const centralStart = offset;
  for (const entry of entries) {
    const buf = new ArrayBuffer(46 + entry.name.length);
    const view = new DataView(buf);
    const arr = new Uint8Array(buf);

    view.setUint32(0, CENTRAL_DIR_HEADER_SIG, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.name.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    arr.set(entry.name, 46);

    parts.push(arr);
    offset += buf.byteLength;
  }

  const centralSize = offset - centralStart;

  // End of central directory
  const eocd = new ArrayBuffer(22);
  const eocdView = new DataView(eocd);
  eocdView.setUint32(0, END_OF_CENTRAL_DIR_SIG, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, centralStart, true);
  eocdView.setUint16(20, 0, true);
  parts.push(new Uint8Array(eocd));

  // Concatenate all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }
  return result;
}
