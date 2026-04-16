import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users } from "lucide-react";
import { PersonalMode } from "@/components/PersonalMode";
import { GroupMode } from "@/components/GroupMode";
import { createFileRoute } from "@tanstack/react-router";
import { GoogleAuth } from "@/components/GoogleAuth";

export const Route = createFileRoute("/")({
  component: App,
  head: () => ({
    meta: [
      { title: "小團分帳 — 輕鬆記帳分帳" },
      { name: "description", content: "零打字記帳，iPhone 原生風格的小團分帳 Web App" },
      { property: "og:title", content: "小團分帳" },
      { property: "og:description", content: "零打字記帳，輕鬆分帳" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
});

type Tab = "personal" | "group";

function App() {
  const [tab, setTab] = useState<Tab>("personal");

  // 👇 --- 第一步：新增 Hydration 防護盾狀態 --- 👇
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const existingLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.href = '/pwa-192x192.png'; // 確保這個檔名跟你放在 public 裡的一樣
      document.head.appendChild(link);
    }

    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (!existingManifest) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }
  }, []);

  // 👇 --- 第二步：如果還沒掛載，先回傳背景空殼子，避免 Server/Client 不一致 --- 👇
  if (!isMounted) {
    return <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto" />;
  }
  // 👆 ----------------------------------------------------------- 👆

  // 下面這裡完全保持不變！
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-5 pt-3 pb-2">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {tab === "personal" ? "個人記帳" : "團體分帳"}
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-24 overflow-y-auto">
        <div className="mb-6">
          <GoogleAuth />
        </div>
        <AnimatePresence mode="wait">
          {tab === "personal" ? (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <PersonalMode />
            </motion.div>
          ) : (
            <motion.div
              key="group"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <GroupMode />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="max-w-md mx-auto flex">
          {([
            { key: "personal" as Tab, label: "個人", Icon: User },
            { key: "group" as Tab, label: "團體", Icon: Users },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center justify-center py-2 pt-3 gap-0.5 transition-colors touch-target ${
                tab === key
                  ? "text-ios-blue"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{label}</span>
              {tab === key && (
                <motion.div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ios-blue rounded-full"
                  layoutId="tabIndicator"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}