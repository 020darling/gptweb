"use client";

import { useMemo, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { Paperclip, Send, X, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export function ChatComposer(props: {
  disabled?: boolean;
  onSend: (text: string, attachments: Attachment[], rawFiles: File[]) => void;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const attachments: Attachment[] = useMemo(() => {
    return files.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
    }));
  }, [files]);

  function pickFiles() {
    inputRef.current?.click();
  }

  function onFilesPicked(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function send() {
    const t = text.trim();
    if (!t && files.length === 0) return;
    props.onSend(t, attachments, files);
    setText("");
    setFiles([]);
  }

  return (
    // ✅ 底部毛玻璃輸入區
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="sticky bottom-0 z-20 border-t border-white/20 glass px-4 py-4"
    >
      <div className="mx-auto w-full max-w-4xl">
        {/* attachments preview */}
        {files.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((f, idx) => {
              const isImage = f.type.startsWith("image/");
              return (
                <div
                  key={`${f.name}-${idx}`}
                  className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/30 px-3 py-2 text-xs shadow-sm"
                >
                  {isImage ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
                  <span className="max-w-[220px] truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="grid h-6 w-6 place-items-center rounded-xl border border-white/30 bg-white/40 hover:bg-white/50 active:scale-[0.98]"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFilesPicked(e.target.files)}
          />

          <button
            onClick={pickFiles}
            disabled={props.disabled}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-white/30 bg-white/40 shadow-sm transition hover:bg-white/50 active:scale-[0.99] disabled:opacity-50"
            title="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="flex-1 rounded-3xl border border-white/30 bg-white/40 shadow-sm backdrop-blur">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={props.disabled ? "Waiting…" : "Message…"}
              disabled={props.disabled}
              rows={1}
              className="max-h-40 w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-neutral-600 disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>

          <button
            onClick={send}
            disabled={props.disabled || (!text.trim() && files.length === 0)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-neutral-900 px-4 text-sm text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            title="Send"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="mt-2 text-[11px] text-neutral-700">
          Enter 發送 · Shift+Enter 換行
        </div>
      </div>
    </motion.div>
  );
}