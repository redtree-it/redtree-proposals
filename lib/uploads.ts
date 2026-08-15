import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "./env";

// PNG/JPG only — the Word export embeds the logo directly and the docx
// library's image support doesn't cover WEBP, and SVG would need a rasterized
// fallback image we have no way to generate.
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

export class UnsupportedFileTypeError extends Error {}

function uploadsDir(): string {
  return path.join(getDataDir(), "uploads");
}

// Stores the file under data/uploads with a random name (never the client's
// original filename) and returns the relative path used both as the DB value
// and as the suffix served by GET /uploads/[...path].
export async function saveUpload(file: File): Promise<string> {
  const ext = ALLOWED_EXTENSIONS[file.type];
  if (!ext) {
    throw new UnsupportedFileTypeError(`Unsupported file type: ${file.type || "unknown"}`);
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return filename;
}

export async function readUpload(filename: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(uploadsDir(), filename));
}

export function absoluteUploadPath(filename: string): string {
  return path.join(uploadsDir(), filename);
}
