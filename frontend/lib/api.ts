/**
 * Public API base for browser fetches. Set in `.env.local`:
 *   NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
 */
export function getApiBase(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE
      ? process.env.NEXT_PUBLIC_API_BASE.trim().replace(/\/$/, "")
      : "";
  return fromEnv || "http://127.0.0.1:8000";
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
