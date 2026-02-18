export type SavedServer = {
  id: string;
  name: string;
  baseUrl: string;

  token?: string;

  status: "unknown" | "online" | "offline" | "auth_failed";
  region?: string;
  lastCheckedAt?: number;
};

const KEY = "ai_gateway_servers_v2";
const ACTIVE_KEY = "ai_gateway_active_server_v1";

function hasWindow() {
  return typeof window !== "undefined";
}

function safeGet(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function loadServers(): SavedServer[] {
  const raw = safeGet(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveServers(servers: SavedServer[]) {
  safeSet(KEY, JSON.stringify(servers));
}

export function getActiveServerId(): string | null {
  return safeGet(ACTIVE_KEY);
}

export function setActiveServerId(id: string) {
  safeSet(ACTIVE_KEY, id);
}

export function pickActiveServer(servers: SavedServer[]): SavedServer | null {
  const id = getActiveServerId();
  if (!id) return servers[0] || null;
  return servers.find((s) => s.id === id) || servers[0] || null;
}

export function uid(prefix = "s") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Normalize input to a URL string.
 * - trims trailing slashes
 * - if scheme missing, assumes https:// by default (safer)
 */
export function normalizeBaseUrl(input: string) {
  const raw = (input || "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("Invalid server URL");

  // If user pastes without scheme: default to https
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`.replace(/\/+$/, "");
  }

  return raw.replace(/\/+$/, "");
}

/**
 * Apply scheme based on "preferHttps" toggle.
 * - Keeps host/port/path
 * - Works even if user pasted without scheme
 */
export function applyScheme(input: string, preferHttps: boolean) {
  const normalized = normalizeBaseUrl(input);
  let u: URL;

  try {
    u = new URL(normalized);
  } catch {
    throw new Error("Invalid server URL");
  }

  u.protocol = preferHttps ? "https:" : "http:";
  return u.toString().replace(/\/+$/, "");
}

/**
 * Validate base URL with security policy.
 *
 * Default policy (safe):
 * - https required for non-localhost
 * - http allowed only for localhost/127.0.0.1/::1
 *
 * Optional policy (explicitly allowed by Settings toggle):
 * - allowInsecureNonLocal = true: allow http on private LAN / non-local too
 *   (⚠️ should be used only for internal network testing; HTTPS is recommended for production)
 */
export function normalizeAndValidateBaseUrl(
  input: string,
  opts?: { allowInsecureNonLocal?: boolean }
) {
  const baseUrl = normalizeBaseUrl(input);

  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new Error("Invalid server URL");
  }

  const isLocal =
    u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";

  const allowInsecureNonLocal = opts?.allowInsecureNonLocal === true;

  // ✅ If https, always ok
  if (u.protocol === "https:") {
    return u.toString().replace(/\/+$/, "");
  }

  // ✅ If http: allow only for localhost unless explicitly allowed
  if (u.protocol === "http:") {
    if (isLocal) return u.toString().replace(/\/+$/, "");

    if (allowInsecureNonLocal) {
      return u.toString().replace(/\/+$/, "");
    }

    throw new Error("Insecure server URL. Use https:// (http allowed only for localhost).");
  }

  throw new Error("Invalid server URL protocol");
}
