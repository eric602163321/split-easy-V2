import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">找不到頁面</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          你尋找的頁面不存在或已被移動。
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // 鎖定手機縮放比例，讓它用起來更像原生的 iOS App
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no" },
      { title: "小團分帳 Pro" },
      { name: "description", content: "零打字記帳，輕鬆分帳" },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:title", content: "小團分帳 Pro" },
      { property: "og:description", content: "零打字記帳，輕鬆分帳" },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // 👇 加入 iOS App 專屬圖示 👇
      {
        rel: "apple-touch-icon",
        href: "/pwa-192x192.png",
      },
      // 👇 加入 PWA 身分證 👇
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
    // 👇 加入 Google 雲端連線必備工具 👇
    scripts: [
      {
        src: "https://accounts.google.com/gsi/client",
        async: true,
        defer: true,
      },
      {
        src: "https://apis.google.com/js/api.js",
        async: true,
        defer: true,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    // 順便把語系改成台灣繁體中文
    <html lang="zh-TW">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}