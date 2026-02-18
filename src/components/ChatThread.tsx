"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

export function ChatThread(props: { messages: ChatMessage[]; isStreaming: boolean }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => props.messages || [], [props.messages]);

  useEffect(() => {
    // auto scroll on new messages / streaming
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [normalized.length, props.isStreaming]);

  return (
    <div className="flex min-h-0 flex-1">
      {/* ✅ 透明毛玻璃主內容區 */}
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
            {normalized.map((m) => {
              const isUser = m.role === "user";
              const isAssistant = m.role === "assistant";

              return (
                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[90%] sm:max-w-[75%]",
                      "rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      "border",
                      // ✅ bubble 毛玻璃
                      isUser
                        ? "glass-dark border-white/10"
                        : "glass border-white/25 text-neutral-900",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap break-words">{String(m.content ?? "")}</div>

                    {/* attachments display (optional) */}
                    {m.attachments?.length ? (
                      <div className="mt-2 space-y-1">
                        {m.attachments.map((a, idx) => (
                          <div
                            key={`${m.id}-att-${idx}`}
                            className={[
                              "rounded-2xl border px-3 py-2 text-xs",
                              isUser ? "border-white/10 bg-white/10 text-white/80" : "border-white/25 bg-white/30",
                            ].join(" ")}
                          >
                            {a.name} {a.type ? `(${a.type})` : ""}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className={`mt-2 text-[11px] ${isUser ? "text-white/60" : "text-neutral-500"}`}>
                      {isAssistant && props.isStreaming && m === normalized[normalized.length - 1] ? "Typing…" : ""}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}