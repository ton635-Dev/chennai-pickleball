import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MemberProvider } from "@/components/MemberProvider";
import { MemberGate } from "@/components/MemberGate";
import { AppShell } from "@/components/AppShell";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Chennai Pickleball",
  description: "チェンナイ ピックルボールサークルの活動管理アプリ",
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
      </body>
    </html>
  );
}
