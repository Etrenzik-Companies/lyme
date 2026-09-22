/**
 * Metadata stripping for uploaded photos.
 *
 * People submitting stories about being sick routinely upload phone photos, and phone
 * photos carry GPS coordinates. There is no image library in the Workers runtime, so
 * rather than re-encoding we walk the container format and drop the metadata segments.
 * That handles the case that actually matters — EXIF GPS — without a WASM dependency.
 *
 * JPEG: drop every APPn marker (EXIF lives in APP1, IPTC/Photoshop in APP13, XMP in APP1).
 * PNG:  keep only the critical chunks plus the handful of ancillary ones needed to render.
 * WebP: drop the EXIF and XMP chunks from the RIFF container.
 */

const JPEG_KEEP_APP0 = false; // JFIF is harmless but carries nothing we need

export function sniff(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp';
  return null;
}

function stripJpeg(bytes) {
  const out = [];
  let i = 2;                                   // past SOI
  out.push(0xff, 0xd8);

  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) { i++; continue; }

    const marker = bytes[i + 1];

    // Start of scan: the rest is entropy-coded image data, copy verbatim and stop.
    if (marker === 0xda) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
      break;
    }
    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    const drop = isComment || (isApp && !(JPEG_KEEP_APP0 && marker === 0xe0));

    if (!drop) {
      for (let j = i; j < i + 2 + len; j++) out.push(bytes[j]);
    }
    i += 2 + len;
  }

  return new Uint8Array(out);
}

function stripPng(bytes) {
  // Ancillary chunks that affect rendering and are safe to keep.
  const KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'acTL', 'fcTL', 'fdAT']);
  const out = [];
  for (let i = 0; i < 8; i++) out.push(bytes[i]);   // signature

  let i = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (i < bytes.length - 8) {
    const len = view.getUint32(i);
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    const total = 12 + len;
    if (KEEP.has(type)) {
      for (let j = i; j < i + total && j < bytes.length; j++) out.push(bytes[j]);
    }
    if (type === 'IEND') break;
    i += total;
  }
  return new Uint8Array(out);
}

function stripWebp(bytes) {
  const DROP = new Set(['EXIF', 'XMP ', 'ICCP']);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = [];
  for (let i = 0; i < 12; i++) out.push(bytes[i]);  // RIFF header + WEBP fourcc

  let i = 12;
  while (i < bytes.length - 8) {
    const type = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
    const len = view.getUint32(i + 4, true);
    const padded = len + (len % 2);
    if (!DROP.has(type)) {
      for (let j = i; j < i + 8 + padded && j < bytes.length; j++) out.push(bytes[j]);
    }
    i += 8 + padded;
  }

  const result = new Uint8Array(out);
  new DataView(result.buffer).setUint32(4, result.length - 8, true);   // fix RIFF size
  return result;
}

/**
 * @returns {{bytes: Uint8Array, contentType: string} | null} null when the file is not
 *          a supported image, which the caller should treat as a rejection.
 */
export function stripMetadata(buffer) {
  const bytes = new Uint8Array(buffer);
  const type = sniff(bytes);
  if (!type) return null;

  try {
    if (type === 'image/jpeg') return { bytes: stripJpeg(bytes), contentType: type };
    if (type === 'image/png') return { bytes: stripPng(bytes), contentType: type };
    if (type === 'image/webp') return { bytes: stripWebp(bytes), contentType: type };
  } catch (err) {
    console.error('[image] strip failed:', err.message);
    return null;                                   // fail closed: no strip, no upload
  }
  return null;
}
