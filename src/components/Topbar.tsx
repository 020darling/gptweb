"use client";

import { useEffect, useMemo, useState } from "react";
import type { Provider } from "@/lib/types";
import { fetchModels } from "@/lib/api";
import { loadServers, pickActiveServer, setActiveServerId } from "@/lib/servers";
import { Settings, Server, Cpu, Sparkles, PanelLeft, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

type ModelItem = { id: string };

function escHtml(s: string) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toastOk(title: string, text: string) {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    text,
    showConfirmButton: false,
    timer: 1600,
  });
}

export function TopBar(props: {
  provider: Provider;
  model: string;
  onChangeProvider: (p: Provider) => void;
  onChangeModel: (m: string) => void;
  serverBaseUrl: string | null;
  serverToken: string | null;
  onOpenSidebar?: () => void;
}) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [serversVer, setServersVer] = useState(0);

  const servers = useMemo(() => loadServers(), [serversVer]);
  const activeServer = useMemo(() => pickActiveServer(servers), [servers]);

  const hasToken = !!props.serverToken;

  // Load models for current provider from active server
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setModels([]);
      if (!props.serverBaseUrl || !props.serverToken) return;
      try {
        const r = await fetchModels(props.serverBaseUrl, props.serverToken, props.provider);
        if (cancelled) return;
        setModels((r.models || []).map((m: any) => ({ id: m.id })));
      } catch {
        if (cancelled) return;
        setModels([]);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [props.serverBaseUrl, props.serverToken, props.provider]);

  async function openServerPicker() {
    if (!servers.length) {
      await Swal.fire({
        icon: "info",
        title: "No server",
        text: "請先到 Settings 新增後端伺服器。",
        confirmButtonColor: "#111",
      });
      return;
    }

    const listHtml = servers
      .map((s) => {
        const active = s.id === activeServer?.id;
        const line = `${s.name}  (${s.status}/${s.region || "unknown"})  ${s.token ? "" : "[no token]"}`;
        return `
          <button
            type="button"
            data-id="${escHtml(s.id)}"
            class="pick-item ${active ? "active" : ""}"
            style="
              width:100%;
              text-align:left;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.25);
              background:${active ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)"};
              cursor:pointer;
              display:flex;
              flex-direction:column;
              gap:4px;
            "
          >
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${escHtml(s.name)}
              </span>
              <span class="tick" style="opacity:${active ? 1 : 0};">✔</span>
            </div>
            <div style="font-size:12px;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${escHtml(s.baseUrl)}
            </div>
            <div style="font-size:12px;opacity:.75;">
              status: <b>${escHtml(s.status)}</b> · region: <b>${escHtml(s.region || "unknown")}</b> · token: <b>${
          s.token ? "yes" : "no"
        }</b>
            </div>
          </button>
        `;
      })
      .join("");

    let selected = activeServer?.id || "";

    const result = await Swal.fire({
      title: "Select server",
      html: `
        <div style="text-align:left;">
          <input id="search" type="text" placeholder="Search server..."
            style="
              width:100%;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.25);
              outline:none;
              background: rgba(255,255,255,0.16);
              margin-bottom:10px;
            "
          />
          <div id="list"
            style="
              display:flex;
              flex-direction:column;
              gap:8px;
              max-height: 52vh;
              overflow:auto;
              padding-right:4px;
            "
          >${listHtml}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Use this server",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111",
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return;
        const search = root.querySelector<HTMLInputElement>("#search");
        const list = root.querySelector<HTMLDivElement>("#list");
        const confirmBtn = Swal.getConfirmButton();

        const setActive = (id: string) => {
          selected = id;
          const items = Array.from(list?.querySelectorAll<HTMLButtonElement>(".pick-item") || []);
          for (const btn of items) {
            const bid = btn.getAttribute("data-id") || "";
            const isActive = bid === id;
            btn.style.background = isActive ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)";
            const tick = btn.querySelector<HTMLElement>(".tick");
            if (tick) tick.style.opacity = isActive ? "1" : "0";
          }
          if (confirmBtn) confirmBtn.disabled = !selected;
        };

        list?.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest<HTMLButtonElement>(".pick-item");
          const id = btn?.getAttribute("data-id");
          if (id) setActive(id);
        });

        search?.addEventListener("input", () => {
          const q = (search.value || "").toLowerCase().trim();
          const items = Array.from(list?.querySelectorAll<HTMLButtonElement>(".pick-item") || []);
          for (const btn of items) {
            const name = (btn.textContent || "").toLowerCase();
            btn.style.display = name.includes(q) ? "" : "none";
          }
        });

        setTimeout(() => search?.focus(), 0);
      },
      preConfirm: () => selected,
    });

    if (result.isConfirmed && result.value) {
      const id = String(result.value);
      setActiveServerId(id);
      setServersVer((x) => x + 1);
      await toastOk("Server updated", servers.find((s) => s.id === id)?.name || id);
      // 你原本就係 reload，保持行為一致最穩
      window.location.reload();
    }
  }

  async function openProviderPicker() {
    if (!hasToken) {
      await Swal.fire({
        icon: "warning",
        title: "No token",
        text: "請先到 Settings 新增伺服器並取得 token。",
        confirmButtonColor: "#111",
      });
      return;
    }

    const items: Provider[] = ["gemini", "openai"];
    const listHtml = items
      .map((p) => {
        const active = p === props.provider;
        const label = p === "gemini" ? "Gemini" : "OpenAI";
        return `
          <button
            type="button"
            data-id="${p}"
            class="pick-item ${active ? "active" : ""}"
            style="
              width:100%;
              text-align:left;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.25);
              background:${active ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)"};
              cursor:pointer;
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
            "
          >
            <span style="font-weight:600;">${label}</span>
            <span class="tick" style="opacity:${active ? 1 : 0};">✔</span>
          </button>
        `;
      })
      .join("");

    let selected: Provider = props.provider;

    const result = await Swal.fire({
      title: "Select provider",
      html: `
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
          ${listHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Use this provider",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111",
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return;
        const list = root;

        const setActive = (id: Provider) => {
          selected = id;
          const items = Array.from(list.querySelectorAll<HTMLButtonElement>(".pick-item"));
          for (const btn of items) {
            const bid = (btn.getAttribute("data-id") || "gemini") as Provider;
            const isActive = bid === id;
            btn.style.background = isActive ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)";
            const tick = btn.querySelector<HTMLElement>(".tick");
            if (tick) tick.style.opacity = isActive ? "1" : "0";
          }
        };

        list.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest<HTMLButtonElement>(".pick-item");
          const id = btn?.getAttribute("data-id") as Provider | null;
          if (id) setActive(id);
        });
      },
      preConfirm: () => selected,
    });

    if (result.isConfirmed && result.value) {
      const p = String(result.value) as Provider;
      props.onChangeProvider(p);
      await toastOk("Provider updated", p);
    }
  }

  async function openModelPicker() {
    if (!hasToken) {
      await Swal.fire({
        icon: "warning",
        title: "No token",
        text: "請先到 Settings 新增伺服器並取得 token。",
        confirmButtonColor: "#111",
      });
      return;
    }

    if (!models.length) {
      await Swal.fire({
        icon: "info",
        title: "No models",
        text: "目前無可用模型（或尚未載入完成）。",
        confirmButtonColor: "#111",
      });
      return;
    }

    const listHtml = models
      .map((m) => {
        const active = m.id === props.model;
        return `
          <button
            type="button"
            data-id="${escHtml(m.id)}"
            class="pick-item ${active ? "active" : ""}"
            style="
              width:100%;
              text-align:left;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.25);
              background:${active ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)"};
              cursor:pointer;
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
            "
          >
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(m.id)}</span>
            <span class="tick" style="opacity:${active ? 1 : 0};">✔</span>
          </button>
        `;
      })
      .join("");

    let selected = props.model;

    const result = await Swal.fire({
      title: "Select model",
      html: `
        <div style="text-align:left;">
          <div style="font-size:12px;opacity:.75;margin-bottom:8px;">
            Provider: <b>${escHtml(props.provider)}</b>
          </div>

          <input id="search" type="text" placeholder="Search model..."
            style="
              width:100%;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.25);
              outline:none;
              background: rgba(255,255,255,0.16);
              margin-bottom:10px;
            "
          />

          <div id="list"
            style="
              display:flex;
              flex-direction:column;
              gap:8px;
              max-height: 52vh;
              overflow:auto;
              padding-right:4px;
            "
          >${listHtml}</div>

          <div style="font-size:12px;opacity:.7;margin-top:10px;">
            Current: <b id="current">${escHtml(props.model || "")}</b>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Use this model",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111",
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return;
        const search = root.querySelector<HTMLInputElement>("#search");
        const list = root.querySelector<HTMLDivElement>("#list");
        const current = root.querySelector<HTMLSpanElement>("#current");
        const confirmBtn = Swal.getConfirmButton();

        const setActive = (id: string) => {
          selected = id;
          if (current) current.textContent = id;

          const items = Array.from(list?.querySelectorAll<HTMLButtonElement>(".pick-item") || []);
          for (const btn of items) {
            const bid = btn.getAttribute("data-id") || "";
            const isActive = bid === id;
            btn.style.background = isActive ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.10)";
            const tick = btn.querySelector<HTMLElement>(".tick");
            if (tick) tick.style.opacity = isActive ? "1" : "0";
          }
          if (confirmBtn) confirmBtn.disabled = !selected;
        };

        list?.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest<HTMLButtonElement>(".pick-item");
          const id = btn?.getAttribute("data-id");
          if (id) setActive(id);
        });

        search?.addEventListener("input", () => {
          const q = (search.value || "").toLowerCase().trim();
          const items = Array.from(list?.querySelectorAll<HTMLButtonElement>(".pick-item") || []);
          for (const btn of items) {
            const id = (btn.getAttribute("data-id") || "").toLowerCase();
            btn.style.display = id.includes(q) ? "" : "none";
          }
        });

        setTimeout(() => search?.focus(), 0);
      },
      preConfirm: () => selected,
    });

    if (result.isConfirmed && result.value) {
      const m = String(result.value);
      props.onChangeModel(m);
      await toastOk("Model updated", m);
    }
  }

  const serverLabel = activeServer
    ? `${activeServer.name} · ${activeServer.status}/${activeServer.region || "unknown"}${activeServer.token ? "" : " · no token"}`
    : "No server";

  const providerLabel = props.provider === "gemini" ? "Gemini" : "OpenAI";
  const modelLabel = props.model || "Select model";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="border-b border-white/20 glass px-3 py-3"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-2 md:gap-3">
        <button
          onClick={props.onOpenSidebar}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/30 bg-white/40 shadow-sm transition hover:bg-white/50 active:scale-[0.99]"
          aria-label="Open sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="hidden md:grid h-9 w-9 place-items-center rounded-2xl bg-white/40">
          <Server className="h-4 w-4" />
        </div>

        {/*  Server picker button */}
        <button
          onClick={openServerPicker}
          className="min-w-0 flex-1 md:flex-none md:w-[340px] inline-flex items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99]"
          title="Select server"
        >
          <span className="truncate">{serverLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>

        <div className="hidden md:grid h-9 w-9 place-items-center rounded-2xl bg-white/40">
          <Cpu className="h-4 w-4" />
        </div>

        {/*  Provider picker button */}
        <button
          onClick={openProviderPicker}
          disabled={!hasToken}
          className="hidden md:inline-flex w-[140px] items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
          title="Select provider"
        >
          <span className="truncate">{providerLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>

        <div className="hidden md:grid h-9 w-9 place-items-center rounded-2xl bg-white/40">
          <Sparkles className="h-4 w-4" />
        </div>

        {/*  Model picker button */}
        <button
          onClick={openModelPicker}
          disabled={!hasToken}
          className="hidden md:inline-flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
          title="Select model"
        >
          <span className="truncate">{modelLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>

        <a
          href="/settings"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99]"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </a>
      </div>

      {/*  Mobile row (provider + model buttons) */}
      <div className="mx-auto mt-2 flex max-w-4xl gap-2 md:hidden">
        <button
          onClick={openProviderPicker}
          disabled={!hasToken}
          className="flex-1 inline-flex items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
        >
          <span className="truncate">{providerLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>

        <button
          onClick={openModelPicker}
          disabled={!hasToken}
          className="flex-[2] inline-flex items-center justify-between gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
        >
          <span className="truncate">{modelLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </div>
    </motion.div>
  );
}