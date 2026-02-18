"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Conversation } from "@/lib/types";
import { MessageSquarePlus, X, Pencil } from "lucide-react";
import Swal from "sweetalert2";

export function Sidebar(props: {
  conversations: Conversation[];
  activeId: string;
  onNew: () => void;
  onPick: (id: string) => void;

  // ✅ NEW: rename callback
  onRename: (id: string, title: string) => void;

  isOpen?: boolean;
  onClose?: () => void;
  mode?: "desktop" | "drawer";
}) {
  const isDrawer = props.mode === "drawer";

  async function renameConversation(c: Conversation) {
    const result = await Swal.fire({
      title: "Rename chat",
      input: "text",
      inputValue: c.title || "",
      inputPlaceholder: "Enter a new title…",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#111",
      inputValidator: (v) => {
        if (!v || !v.trim()) return "Title cannot be empty";
        if (v.trim().length > 80) return "Title too long (max 80 chars)";
        return null;
      },
    });

    if (result.isConfirmed) {
      props.onRename(c.id, String(result.value).trim());
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Renamed",
        showConfirmButton: false,
        timer: 1200,
      });
    }
  }

  const Header = (
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-semibold text-white/90">
        Yuito自私用的ai -- 外人不准用！🤫❤️
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={props.onNew}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white shadow-sm transition hover:bg-white/15 active:scale-[0.99]"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New
        </button>

        {isDrawer ? (
          <button
            onClick={props.onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white shadow-sm transition hover:bg-white/15 active:scale-[0.99]"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );

  const List = (
    <div className="mt-3 flex-1 overflow-y-auto pr-1">
      <div className="space-y-2 pb-2">
        {props.conversations.map((c) => {
          const active = c.id === props.activeId;

          return (
            <div
              key={c.id}
              className={[
                "w-full rounded-2xl border px-3 py-2 text-sm shadow-sm transition",
                active
                  ? "bg-white/15 text-white border-white/15"
                  : "bg-white/10 text-white/90 border-white/10 hover:bg-white/15",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                {/* click title area to pick */}
                <button
                  onClick={() => {
                    props.onPick(c.id);
                    if (isDrawer) props.onClose?.();
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-medium">{c.title}</div>
                  <div className={`mt-0.5 truncate text-xs ${active ? "text-white/70" : "text-white/60"}`}>
                    {c.provider} · {c.model}
                  </div>
                </button>

                {/* ✅ rename */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    renameConversation(c);
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15 active:scale-[0.99]"
                  title="Rename"
                  aria-label="Rename chat"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const Content = (
    <div className="flex h-full flex-col p-3">
      {Header}
      {List}
    </div>
  );

  if (!isDrawer) {
    return (
      <motion.aside
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        className="hidden h-dvh w-72 shrink-0 border-r border-white/10 glass-dark md:block"
      >
        {Content}
      </motion.aside>
    );
  }

  return (
    <AnimatePresence>
      {props.isOpen ? (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={props.onClose}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
          />
          <motion.aside
            key="drawer"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed left-0 top-0 z-50 h-dvh w-[320px] border-r border-white/10 glass-dark shadow-xl md:hidden"
          >
            {Content}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}