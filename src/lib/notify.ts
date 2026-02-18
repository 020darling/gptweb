"use client";

import Swal from "sweetalert2";

function asText(err: unknown) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || String(err);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export const notify = {
  toastSuccess(message: string, title = "Success") {
    return Toast.fire({ icon: "success", title, text: message });
  },
  toastInfo(message: string, title = "Info") {
    return Toast.fire({ icon: "info", title, text: message });
  },
  toastWarn(message: string, title = "Warning") {
    return Toast.fire({ icon: "warning", title, text: message });
  },
  toastError(message: string, title = "Error") {
    return Toast.fire({ icon: "error", title, text: message });
  },

  // Modal
  async error(err: unknown, title = "Error") {
    return Swal.fire({
      icon: "error",
      title,
      text: asText(err),
      confirmButtonColor: "#111",
    });
  },
  async warn(message: string, title = "Warning") {
    return Swal.fire({
      icon: "warning",
      title,
      text: message,
      confirmButtonColor: "#111",
    });
  },
  async info(message: string, title = "Info") {
    return Swal.fire({
      icon: "info",
      title,
      text: message,
      confirmButtonColor: "#111",
    });
  },
  async confirm(opts: {
    title: string;
    text: string;
    confirmText?: string;
    cancelText?: string;
    icon?: "warning" | "question" | "info" | "error" | "success";
  }) {
    const r = await Swal.fire({
      icon: opts.icon || "question",
      title: opts.title,
      text: opts.text,
      showCancelButton: true,
      confirmButtonText: opts.confirmText || "OK",
      cancelButtonText: opts.cancelText || "Cancel",
      confirmButtonColor: "#111",
    });
    return r.isConfirmed;
  },
};

/**
 * Global handlers: unhandled errors -> toast
 * Call ONCE on app mount (e.g., AppShell useEffect).
 */
let installed = false;
export function installGlobalErrorToasts() {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (e) => {
    // Avoid noisy script errors without details
    const msg = e?.error ? asText(e.error) : e?.message || "Unhandled error";
    notify.toastError(msg, "Unhandled");
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const msg = asText(e.reason);
    notify.toastError(msg, "Unhandled promise");
  });
}