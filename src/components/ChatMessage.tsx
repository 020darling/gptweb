"use client";

import type { ChatMessage as M } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import { FileText, Image as ImageIcon } from "lucide-react";

export function ChatMessage(props: { msg: M }) {
  const isUser = props.msg.role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[780px] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-neutral-900 text-white"
            : "bg-neutral-50 text-neutral-900 border border-neutral-200"
        )}
      >
        {props.msg.attachments?.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {props.msg.attachments.map((a) => {
              const isImg = a.mime.startsWith("image/");
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-2 py-1",
                    isUser ? "border-white/20" : "border-neutral-200"
                  )}
                >
                  {isImg ? (
                    <>
                      <ImageIcon className="h-4 w-4 opacity-80" />
                      <span className="max-w-[180px] truncate">{a.name}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 opacity-80" />
                      <span className="max-w-[180px] truncate">{a.name}</span>
                      <span className="opacity-70 text-xs">{formatBytes(a.size)}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="whitespace-pre-wrap">{props.msg.content}</div>

        {/* 推理摘要（可選） */}
        {props.msg.reasoningSummary ? (
          <div
            className={cn(
              "mt-3 rounded-xl px-3 py-2 text-xs",
              isUser ? "bg-white/10" : "bg-white border border-neutral-200"
            )}
          >
            <div className={cn("mb-1 font-semibold", isUser ? "text-white/90" : "text-neutral-800")}>
              Reasoning summary
            </div>
            <div className={cn(isUser ? "text-white/80" : "text-neutral-700")}>
              {props.msg.reasoningSummary}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}