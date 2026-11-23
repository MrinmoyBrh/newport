import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from './db';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Validate actual file magic bytes to prevent file extension spoofing
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 8) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (mimeType === 'image/svg+xml') {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024)).trim();
    return text.includes('<svg') || (text.startsWith('<?xml') && text.includes('<svg'));
  }

  return false;
}

// Sanitize SVG content against Stored XSS
function sanitizeSvg(content: string): { safe: boolean; sanitized?: string; reason?: string } {
  // Reject scripts, foreignObject, iframes, HTML embeds
  const dangerousTags = /<\s*(script|foreignobject|iframe|embed|object|meta|link)\b/i;
  if (dangerousTags.test(content)) {
    return { safe: false, reason: 'SVG contains disallowed executable or embedding tags.' };
  }

  // Reject event handlers like onload, onerror, onclick
  const dangerousAttrs = /\bon\w+\s*=/i;
  if (dangerousAttrs.test(content)) {
    return { safe: false, reason: 'SVG contains disallowed inline event handlers.' };
  }

  // Reject javascript: URIs
  const javascriptUri = /href\s*=\s*['"]\s*javascript:/i;
  if (javascriptUri.test(content)) {
    return { safe: false, reason: 'SVG contains disallowed javascript URI.' };
  }

  return { safe: true, sanitized: content };
}

export async function getAllMedia(): Promise<any[]> {
  const db = getDb();
  return (await db.prepare('SELECT * FROM media_assets ORDER BY created_at DESC').all()) as any[];
}

export async function getMediaById(id: string): Promise<any | null> {
  const db = getDb();
  return (await db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id)) as any;
}

export async function saveMediaFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  altText = ''
): Promise<{ success: boolean; media?: any; error?: string }> {
  const normalizedMime = mimeType.toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return { success: false, error: 'Invalid file format. Only JPEG, PNG, WEBP, SVG, and GIF images are allowed.' };
  }

  if (buffer.length > MAX_SIZE_BYTES) {
    return { success: false, error: 'File size exceeds maximum allowed limit of 10MB.' };
  }

  // Validate magic bytes to prevent masquerading files
  if (!validateMagicBytes(buffer, normalizedMime)) {
    return { success: false, error: 'File signature does not match the declared MIME type.' };
  }

  let finalBuffer = buffer;

  // Sanitize SVG files to prevent stored XSS
  if (normalizedMime === 'image/svg+xml') {
    const rawSvg = buffer.toString('utf-8');
    const svgCheck = sanitizeSvg(rawSvg);
    if (!svgCheck.safe) {
      return { success: false, error: svgCheck.reason || 'Malicious SVG payload detected.' };
    }
    finalBuffer = Buffer.from(svgCheck.sanitized || rawSvg, 'utf-8');
  }

  const db = getDb();
  let ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    ext = mimeMap[normalizedMime] || '.jpg';
  }

  // Directory traversal defense: strip any path separators and sanitize filename
  const cleanBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanBase}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);
  const publicUrl = `/uploads/${uniqueName}`;

  try {
    fs.writeFileSync(filePath, finalBuffer);

    const id = crypto.randomUUID();
    const insert = db.prepare(`
      INSERT INTO media_assets (id, original_name, filename, file_path, mime_type, size_bytes, alt_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insert.run(id, originalName, uniqueName, publicUrl, mimeType, buffer.length, altText || originalName, Date.now());

    return {
      success: true,
      media: {
        id,
        original_name: originalName,
        filename: uniqueName,
        file_path: publicUrl,
        mime_type: mimeType,
        size_bytes: buffer.length,
        alt_text: altText || originalName,
        created_at: Date.now(),
      },
    };
  } catch (err: any) {
    console.error('File write error:', err);
    return { success: false, error: 'Failed to write media asset to disk.' };
  }
}

export async function deleteMedia(id: string): Promise<boolean> {
  const db = getDb();
  const media = await getMediaById(id);
  if (!media) return false;

  const diskPath = path.join(UPLOAD_DIR, media.filename);
  if (fs.existsSync(diskPath)) {
    try {
      fs.unlinkSync(diskPath);
    } catch (e) {
      console.warn('Could not remove file from disk:', e);
    }
  }

  await db.prepare('DELETE FROM media_assets WHERE id = ?').run(id);
  return true;
}

export async function updateMediaAlt(id: string, altText: string): Promise<void> {
  const db = getDb();
  await db.prepare('UPDATE media_assets SET alt_text = ? WHERE id = ?').run(altText, id);
}
