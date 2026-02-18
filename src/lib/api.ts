import { parseSSE } from "./sse";
import type { Provider } from "./types";

export async function serverLogin(baseUrl: string, username: string, password: string) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ token: string }>;
}

export async function getServerHealth(baseUrl: string) {
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean }>;
}

export async function getServerMeta(baseUrl: string) {
  const res = await fetch(`${baseUrl}/meta`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; region: string; providers: string[] }>;
}

export async function fetchModels(baseUrl: string, token: string, provider: Provider) {
  const res = await fetch(`${baseUrl}/models?provider=${provider}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ provider: Provider; models: any[] }>;
}

export type StreamChatInput = {
  provider: Provider;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  files?: File[];
};

export async function streamChatWithServer(
  baseUrl: string,
  token: string,
  input: StreamChatInput,
  onEvent: (ev: { event: string; data: any }) => void,
  signal?: AbortSignal
) {
  const hasFiles = input.files && input.files.length > 0;

  let res: Response;

  if (hasFiles) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify({ provider: input.provider, model: input.model, messages: input.messages }));
    for (const f of input.files!) fd.append("file", f, f.name);

    res = await fetch(`${baseUrl}/chat/stream`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      signal,
    });
  } else {
    res = await fetch(`${baseUrl}/chat/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider: input.provider, model: input.model, messages: input.messages }),
      signal,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  if (!res.body) throw new Error("No response body");

  for await (const ev of parseSSE(res.body)) onEvent(ev);
}