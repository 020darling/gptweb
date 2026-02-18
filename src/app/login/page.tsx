"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onLogin() {
    setErr(null);
    setBusy(true);
    try {
      const r = await login(username, password);
      setToken(r.token);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message || "login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">AI Gateway</div>
        <div className="mt-1 text-sm text-neutral-600">
          請使用管理員在伺服器上建立的帳號登入。
        </div>

        <div className="mt-5 space-y-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            autoComplete="username"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") onLogin();
            }}
          />
        </div>

        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

        <button
          disabled={busy || !username || !password}
          onClick={onLogin}
          className="mt-4 w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Logging in…" : "Login"}
        </button>

        <div className="mt-4 text-xs text-neutral-500">
          本頁不提供任何註冊/生成入口。帳號只能由伺服器 CLI 建立。
        </div>
      </div>
    </div>
  );
}
