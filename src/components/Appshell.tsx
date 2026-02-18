"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Conversation, Provider, Attachment } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./Topbar";
import { ChatThread } from "./ChatThread";
import { ChatComposer } from "./Chatcomposer";
import { streamChatWithServer } from "@/lib/api";
import { loadServers, pickActiveServer, type SavedServer } from "@/lib/servers";
import { installGlobalErrorToasts, notify } from "@/lib/notify";

const LS_KEY = "ai_gateway_chat_state_v1";

type Persisted = {
  conversations: Conversation[];
  activeId: string;
  messagesByConv: Record<string, ChatMessage[]>;
};

function safeParsePersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePersisted(state: Persisted) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function isDefaultTitle(t?: string) {
  const s = (t || "").trim().toLowerCase();
  return !s || s === "new chat";
}

function autoTitleFromFirstUser(msgs: ChatMessage[]) {
  const firstUser = msgs.find((m) => m.role === "user" && (m.content || "").trim());
  const raw = (firstUser?.content || "").trim().replace(/\s+/g, " ");
  if (!raw) return "New chat";
  return raw.length > 24 ? raw.slice(0, 24) + "…" : raw;
}

export function AppShell() {
  const [mounted, setMounted] = useState(false);
  const [booted, setBooted] = useState(false);

  const [servers, setServers] = useState<SavedServer[]>([]);
  const activeServer = useMemo(() => pickActiveServer(servers), [servers]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState<string>("gemini-2.5-flash");

  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "c_1", title: "New chat", provider: "gemini", model: "gemini-2.5-flash", createdAt: 0, updatedAt: 0 },
  ]);
  const [activeId, setActiveId] = useState<string>("c_1");
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({
    c_1: [{ id: "m_1", role: "assistant", content: "Loading…", createdAt: 0 }],
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeMessages = messagesByConv[activeId] || [];
  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  useEffect(() => {
    installGlobalErrorToasts();

    setMounted(true);
    setServers(loadServers());

    const persisted = safeParsePersisted();
    if (persisted?.conversations?.length && persisted?.activeId && persisted?.messagesByConv) {
      setConversations(persisted.conversations);
      setActiveId(persisted.activeId);
      setMessagesByConv(persisted.messagesByConv);
    } else {
      const now = Date.now();
      setConversations([
        { id: "c_1", title: "New chat", provider: "gemini", model: "gemini-2.5-flash", createdAt: now, updatedAt: now },
      ]);
      setActiveId("c_1");
      setMessagesByConv({
        c_1: [
          {
            id: uid("m"),
            role: "assistant",
            content: "請到 Settings 新增後端伺服器並取得 token 後再使用。",
            createdAt: now,
          },
        ],
      });
    }

    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted) return;
    savePersisted({ conversations, activeId, messagesByConv });
  }, [booted, conversations, activeId, messagesByConv]);

  function renameConversation(id: string, title: string) {
    const t = (title || "").trim();
    if (!t) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: t, updatedAt: Date.now() } : c))
    );
  }

  function createNewChat() {
    const id = uid("c");
    const now = Date.now();
    const p: Provider = activeServer?.token ? "gemini" : provider || "gemini";
    const m = p === "openai" ? "gpt-5" : "gemini-2.5-flash";

    const conv: Conversation = { id, title: "New chat", provider: p, model: m, createdAt: now, updatedAt: now };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);

    const firstText = activeServer?.token
      ? "✅ 已連接伺服器"
      : "⚠️ 尚未新增後端伺服器或無法檢測到 token。請到 Settings 新增伺服器。";

    setMessagesByConv((prev) => ({
      ...prev,
      [id]: [{ id: uid("m"), role: "assistant", content: firstText, createdAt: now }],
    }));
  }

  function setConvProviderModel(nextProvider: Provider, nextModel: string) {
    setProvider(nextProvider);
    setModel(nextModel);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, provider: nextProvider, model: nextModel, updatedAt: Date.now() } : c
      )
    );
  }

  async function sendUser(text: string, attachments: Attachment[], rawFiles: File[]) {
    if (isStreaming) return;

    if (!activeServer?.token || !activeServer.baseUrl) {
      const go = await notify.confirm({
        icon: "warning",
        title: "未連接伺服器",
        text: "目前無可用後端服務器或檢測不到 token。前往 Settings 新增伺服器？",
        confirmText: "前往設定",
        cancelText: "取消",
      });
      if (go) window.location.href = "/settings";
      return;
    }

    const convId = activeId;

    const userMsg: ChatMessage = {
      id: uid("m"),
      role: "user",
      content: text,
      createdAt: Date.now(),
      attachments,
    };

    const assistantId = uid("m");
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), userMsg, assistantMsg],
    }));
    setIsStreaming(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    let sawAnyDelta = false;
    try {
      const p = activeConv?.provider || provider;
      const m = activeConv?.model || model;

      const history = [...(messagesByConv[convId] || []), userMsg].map((x) => ({
        role: x.role,
        content: x.content,
      }));

      await streamChatWithServer(
        activeServer.baseUrl,
        activeServer.token,
        { provider: p, model: m, messages: history, files: rawFiles },
        (ev) => {
          if (ev.event === "delta") {
            const delta = ev.data?.text || "";
            if (!delta) return;
            sawAnyDelta = true;

            setMessagesByConv((prev) => {
              const arr = [...(prev[convId] || [])];
              const idx = arr.findIndex((x) => x.id === assistantId);
              if (idx === -1) return prev;
              arr[idx] = { ...arr[idx], content: (arr[idx].content || "") + delta };
              return { ...prev, [convId]: arr };
            });
          } else if (ev.event === "error") {
            const msg = ev.data?.message || "Unknown error";
            notify.toastError(msg, "AI 回應失敗");

            setMessagesByConv((prev) => {
              const arr = [...(prev[convId] || [])];
              const idx = arr.findIndex((x) => x.id === assistantId);
              if (idx === -1) return prev;
              arr[idx] = { ...arr[idx], content: `❌ ${msg}` };
              return { ...prev, [convId]: arr };
            });
          }
        },
        ac.signal
      );

      //  Auto-rename after first successful assistant output (only if still default title)
      if (sawAnyDelta) {
        setConversations((prev) => {
          const c = prev.find((x) => x.id === convId);
          if (!c || !isDefaultTitle(c.title)) return prev;

          // Use the first user message of this conversation
          const msgs = messagesByConv[convId] || [];
          const title = autoTitleFromFirstUser([...msgs, userMsg]);
          return prev.map((x) => (x.id === convId ? { ...x, title, updatedAt: Date.now() } : x));
        });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      notify.toastError(msg, "請求失敗");

      setMessagesByConv((prev) => {
        const arr = [...(prev[convId] || [])];
        const idx = arr.findIndex((x) => x.id === assistantId);
        if (idx === -1) return prev;
        arr[idx] = { ...arr[idx], content: `❌ ${msg}` };
        return { ...prev, [convId]: arr };
      });
    } finally {
      setIsStreaming(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-dvh w-full">
        <div className="hidden w-72 shrink-0 border-r glass-dark md:block" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b glass px-4 py-3">
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-white/40" />
              <div className="h-9 flex-1 rounded-2xl bg-white/40" />
              <div className="h-9 w-24 rounded-2xl bg-white/40" />
            </div>
          </div>
          <div className="flex-1 px-4 py-6">
            <div className="mx-auto max-w-4xl space-y-3">
              <div className="h-12 rounded-3xl glass" />
              <div className="h-12 rounded-3xl glass" />
              <div className="h-12 rounded-3xl glass" />
            </div>
          </div>
          <div className="border-t glass p-4">
            <div className="mx-auto max-w-4xl">
              <div className="h-12 rounded-3xl bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full">
      {/* Desktop sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onNew={createNewChat}
        onPick={setActiveId}
        onRename={renameConversation}
      />

      {/* Mobile drawer sidebar */}
      <Sidebar
        mode="drawer"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onNew={() => {
          createNewChat();
          setSidebarOpen(false);
        }}
        onPick={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onRename={renameConversation}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          provider={activeConv?.provider || provider}
          model={activeConv?.model || model}
          onChangeProvider={(p) => setConvProviderModel(p, p === "openai" ? "gpt-5" : "gemini-2.5-flash")}
          onChangeModel={(m) => setConvProviderModel(activeConv?.provider || provider, m)}
          serverBaseUrl={activeServer?.baseUrl || null}
          serverToken={activeServer?.token || null}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <ChatThread messages={activeMessages} isStreaming={isStreaming} />
        <ChatComposer disabled={isStreaming} onSend={(text, atts, files) => sendUser(text, atts, files)} />

        {/* harmless */}
        <div className="border-t glass p-0" />
      </main>
    </div>
  );
}
