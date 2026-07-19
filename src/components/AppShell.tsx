"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { MeChip } from "./MeChip";
import { PickleballIcon } from "./PickleballIcon";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // スコアボードは専用の全画面ダークUI(シェルなし)
  const bare = pathname.startsWith("/scoreboard/play");

  if (bare) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
      {/* デスクトップ: 上部水平ナビ */}
      <nav className="sticky top-0 z-30 hidden h-16 items-center gap-7 border-b border-line bg-surface px-8 md:flex">
        <Link href="/" className="flex items-center gap-2.5 text-[17px] font-extrabold">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-accent">
            <PickleballIcon className="h-5 w-5" />
          </span>
          Chennai Pickleball
        </Link>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`border-b-[3px] py-5 text-sm font-bold ${
              isActive(pathname, item.href)
                ? "border-primary text-primary-dark"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <div className="ml-auto">
          <MeChip />
        </div>
      </nav>

      {/* モバイル: 上部ブランドヘッダー */}
      <header className="flex items-center justify-between px-5 pb-3 pt-5 md:hidden">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-extrabold">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-primary text-accent">
            <PickleballIcon className="h-[18px] w-[18px]" />
          </span>
          Chennai Pickleball
        </Link>
        <MeChip />
      </header>

      {/* コンテンツ */}
      <main className="flex-1 px-4 pb-24 md:px-8 md:pb-10">{children}</main>

      {/* モバイル: 下部タブナビ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app border-t border-line bg-surface px-1.5 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-[3px] pb-4 text-[10px] font-bold ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <span className="h-[23px] w-[23px]">{item.icon}</span>
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
