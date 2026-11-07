import fs from 'node:fs';
import path from 'node:path';

/**
 * Pixel size of an image in `public/`, read from its header at build time, so
 * article images can go through next/image (responsive srcset, WebP/AVIF,
 * reserved space so nothing jumps as they load) without every post having to
 * spell out a width and height. Handles PNG, JPEG, WebP and GIF; anything else,
 * or a file that isn't there, returns null and the caller falls back to <img>.
 * Server-only (`node:fs`).
 */

export type ImageSize = { width: number; height: number };

const cache = new Map<string, ImageSize | null>();

export function publicImageSize(src: string): ImageSize | null {
  if (!src.startsWith('/') || src.startsWith('//')) return null;
  const clean = src.split(/[?#]/)[0];
  if (cache.has(clean)) return cache.get(clean) ?? null;

  const file = path.join(process.cwd(), 'public', clean);
  let size: ImageSize | null = null;
  try {
    size = readSize(fs.readFileSync(file));
  } catch {
    size = null;
  }
  cache.set(clean, size);
  return size;
}

function readSize(buf: Buffer): ImageSize | null {
  // PNG: the IHDR chunk always comes first.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: logical screen size, little-endian.
  if (buf.length >= 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: RIFF container holding one of three chunk types.
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    }
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    return null;
  }

  // JPEG: walk the segments to the first start-of-frame marker.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
  }

  return null;
}
