import path from "node:path";

export class MissingEnvError extends Error {}

// Where the SQLite file and uploaded logo/exports live. Configurable so a
// hosting platform's persistent volume can be mounted anywhere (e.g. /data)
// without the app needing to guess that platform's working-directory convention.
export function getDataDir(): string {
  return process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
}

export function getAuthSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new MissingEnvError(
      "Missing required environment variable: AUTH_SECRET. Set it to a long random string in .env.local."
    );
  }
  return value;
}
