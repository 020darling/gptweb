import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Gateway",
  description: "Chat UI for OpenAI + Gemini via your own backend gateway",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="h-full">
      <body className="h-full min-h-dvh bg-transparent">
        {/*  App 根容 */}
        <div className="relative min-h-dvh">
          {/* 背景層 */}
          <div className="fixed inset-0 z-0">
            {/*  img 強制載入 */}
            <img
              src="/bg.jpg"
              alt="background"
              className="h-full w-full object-cover"
              draggable={false}
            />
            {/* 暗色遮罩 */}
            <div className="absolute inset-0 bg-black/35" />
          </div>

          {/* 內容層 */}
          <div className="relative z-10 min-h-dvh">{children}</div>
        </div>
      </body>
    </html>
  );
}
