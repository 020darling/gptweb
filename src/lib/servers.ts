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

export function normalizeAndValidateBaseUrl(input: string) {
  const baseUrl = input.replace(/\/+$/, "");
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new Error("Invalid server URL");
  }

  const isLocal =
    u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";

  if (u.protocol !== "https:" && !isLocal) {
    throw new Error("Insecure server URL. Use https:// (http allowed only for localhost).");
  }

  return u.toString().replace(/\/+$/, "");
}