/**
 * Read Titanium Guardian browser auth tokens (shared origin with TG frontend).
 * Mirrors TG `app/utils/auth.ts` storage keys and legacy sessionStorage migration.
 */

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

function readTokenStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/** Migrate tokens from sessionStorage (older TG builds) into localStorage. */
export function migrateLegacyTgSessionTokens(): void {
  if (typeof window === "undefined") return;

  const hasLocal =
    window.localStorage.getItem(ACCESS_TOKEN_KEY) && window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (hasLocal) return;

  const legacyAccess = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const legacyRefresh = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!legacyAccess || !legacyRefresh) return;

  window.localStorage.setItem(ACCESS_TOKEN_KEY, legacyAccess);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, legacyRefresh);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredTgAccessToken(): string | null {
  const storage = readTokenStorage();
  if (!storage) return null;
  migrateLegacyTgSessionTokens();
  const token = storage.getItem(ACCESS_TOKEN_KEY)?.trim();
  return token || null;
}

/** Re-sync bearer when TG login writes tokens (same site, other tabs). */
export function subscribeTgTokenStorage(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY || event.key === null) {
      onChange();
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}