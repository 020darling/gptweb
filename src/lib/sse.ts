export type SSEEvent = { event: string; data: any };

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * Minimal SSE parser for fetch() streaming response.
 * Expects lines like:
 * event: delta
 * data: {"text":"..."}
 */
export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE events separated by blank line
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      let event = "message";
      let dataStr = "";

      for (const line of raw.split("\n")) {
        const l = line.trimEnd();
        if (l.startsWith("event:")) event = l.slice(6).trim();
        else if (l.startsWith("data:")) dataStr += l.slice(5).trim();
      }

      if (!dataStr) continue;
      yield { event, data: safeJsonParse(dataStr) };
    }
  }
}