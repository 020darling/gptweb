"use client";

import { useEffect, useMemo, useState } from "react";
import { Server, Plus, RefreshCw, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { getServerHealth, getServerMeta, serverLogin } from "@/lib/api";
import {
  loadServers,
  saveServers,
  setActiveServerId,
  pickActiveServer,
  uid,
  normalizeAndValidateBaseUrl,
  type SavedServer,
} from "@/lib/servers";
import { notify } from "@/lib/notify";

export default function SettingsPage() {
  const [servers, setServers] = useState<SavedServer[]>([]);
  const active = useMemo(() => pickActiveServer(servers), [servers]);

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8787");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setServers(loadServers());
  }, []);

  function persist(next: SavedServer[]) {
    setServers(next);
    saveServers(next);
  }

  async function refreshOne(s: SavedServer) {
    try {
      const h = await getServerHealth(s.baseUrl);
      const meta = await getServerMeta(s.baseUrl);
      return {
        ...s,
        status: h.ok ? "online" : "offline",
        region: meta.region,
        lastCheckedAt: Date.now(),
      } as SavedServer;
    } catch {
      return { ...s, status: "offline", lastCheckedAt: Date.now() } as SavedServer;
    }
  }

  async function addServer() {
    setBusy(true);
    try {
      const cleanUrl = normalizeAndValidateBaseUrl(baseUrl);
      const displayName = name.trim() || cleanUrl;

      const r = await serverLogin(cleanUrl, username, password);

      let status: SavedServer["status"] = "online";
      let region = "unknown";
      try {
        const meta = await getServerMeta(cleanUrl);
        region = meta.region;
      } catch {}
      try {
        const h = await getServerHealth(cleanUrl);
        status = h.ok ? "online" : "offline";
      } catch {
        status = "offline";
      }

      const s: SavedServer = {
        id: uid("srv"),
        name: displayName,
        baseUrl: cleanUrl,
        token: r.token,
        status,
        region,
        lastCheckedAt: Date.now(),
      };

      const next = [s, ...servers];
      persist(next);
      setActiveServerId(s.id);

      setName("");
      setUsername("");
      setPassword("");

      notify.toastSuccess(`已取得 token。Region: ${region}`, "Server added");
    } catch (e: any) {
      await notify.error(e?.message || String(e), "Add server failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    setBusy(true);
    try {
      const next: SavedServer[] = [];
      for (const s of servers) next.push(await refreshOne(s));
      persist(next);
      notify.toastSuccess("狀態已更新", "Refreshed");
    } finally {
      setBusy(false);
    }
  }

  function setActive(id: string) {
    setActiveServerId(id);
    setServers((prev) => [...prev]);
  }

  async function removeServer(id: string) {
    const s = servers.find((x) => x.id === id);
    const ok = await notify.confirm({
      icon: "warning",
      title: "Remove server?",
      text: s ? s.name : "Confirm remove",
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (!ok) return;

    const next = servers.filter((x) => x.id !== id);
    persist(next);
    if (active?.id === id && next[0]) setActiveServerId(next[0].id);
    notify.toastInfo("已移除伺服器", "Removed");
  }

  async function clearToken(id: string) {
    const s = servers.find((x) => x.id === id);
    const ok = await notify.confirm({
      icon: "question",
      title: "Clear token?",
      text: s ? s.name : "Confirm",
      confirmText: "Clear",
      cancelText: "Cancel",
    });
    if (!ok) return;

    const next: SavedServer[] = servers.map((x) =>
  x.id === id
    ? ({
        ...x,
        token: undefined,
        status: "auth_failed" as const,
      } satisfies SavedServer)
    : x
);

persist(next);
    notify.toastWarn("Token 已清除", "Token cleared");
  }

  return (
    <div className="min-h-dvh p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/40 shadow-sm">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white drop-shadow">Settings</div>
            <div className="text-sm text-white/80 drop-shadow">Manage backend servers (token only, no saved passwords)</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/25 glass p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Add server
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <input className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" placeholder="Backend URL (https://...)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <input className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" placeholder="Username (not saved)" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/40" placeholder="Password (not saved)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={busy || !baseUrl || !username || !password}
              onClick={addServer}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2 text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? "Working…" : "Login & Save Token"}
            </button>

            <button
              disabled={busy || servers.length === 0}
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/40 px-4 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh status
            </button>
          </div>

          <div className="mt-3 text-xs text-white/80">
            ✅ 安全：除 localhost/127.0.0.1 外，URL 必須為 https://
          </div>
        </div>

        <div className="rounded-3xl border border-white/25 glass p-5 shadow-sm">
          <div className="text-sm font-semibold">Configured</div>

          {servers.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-700">No servers yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {servers.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-3xl border border-white/25 bg-white/25 p-4 transition hover:bg-white/30">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {s.name} {active?.id === s.id ? <span className="text-xs text-green-800">（active）</span> : null}
                    </div>
                    <div className="truncate text-xs text-neutral-800">{s.baseUrl}</div>
                    <div className="mt-1 text-xs text-neutral-800">
                      Status: <span className="font-medium">{s.status}</span> · Region:{" "}
                      <span className="font-medium">{s.region || "unknown"}</span> · Token:{" "}
                      <span className="font-medium">{s.token ? "yes" : "no"}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setActive(s.id)} className="rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-xs shadow-sm transition hover:bg-white/50 active:scale-[0.99]">
                      Set active
                    </button>
                    <button onClick={() => clearToken(s.id)} className="inline-flex items-center gap-1 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-xs shadow-sm transition hover:bg-white/50 active:scale-[0.99]">
                      <KeyRound className="h-3.5 w-3.5" />
                      Clear token
                    </button>
                    <button onClick={() => removeServer(s.id)} className="inline-flex items-center gap-1 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-xs shadow-sm transition hover:bg-white/50 active:scale-[0.99]">
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-white/80 drop-shadow">
          全站毛玻璃背景已啟用。請確保 /public/bg.jpg 存在。
        </div>
      </div>
    </div>
  );
}
