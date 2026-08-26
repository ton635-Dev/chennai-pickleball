import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MemberProvider } from "@/components/MemberProvider";
import { MemberGate } from "@/components/MemberGate";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_DESCRIPTION,
  BEACON_APP_ID,
  ICON_SUFFIX,
} from "@/lib/branding";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  // アイコンはデプロイごとに色を切り替えるため、ファイル規約ではなく public + metadata で指定
  icons: {
    icon: [{ url: `/icon${ICON_SUFFIX}.png`, type: "image/png" }],
    apple: [{ url: `/apple-icon${ICON_SUFFIX}.png`, type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#0E7C63",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* 利用状況の計測ビーコン */}
        <script
          defer
          src="https://app-hub-6rf.pages.dev/beacon.js"
          data-app={BEACON_APP_ID}
        />
      </head>
      <body>
        {!isSupabaseConfigured && (
          <div className="bg-amber px-4 py-2 text-center text-[13px] font-bold text-navy">
            Supabase が未設定です。README のセットアップ手順に従って .env.local
            を作成してください。
          </div>
        )}
        <MemberProvider>
          <AppShell>{children}</AppShell>
          <MemberGate />
        </MemberProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
