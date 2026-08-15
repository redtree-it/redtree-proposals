import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "./env";

function exportsDir(): string {
  return path.join(getDataDir(), "exports");
}

export async function saveExport(buffer: Buffer): Promise<string> {
  const dir = exportsDir();
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}.docx`;
  await writeFile(path.join(dir, storedName), buffer);
  return storedName;
}

export async function readExport(storedName: string): Promise<Buffer> {
  return readFile(path.join(exportsDir(), storedName));
}

// Safe for a Content-Disposition filename and for Windows/macOS filesystems —
// strips characters invalid on Windows and collapses whitespace.
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim().replace(/\s+/g, " ");
}
