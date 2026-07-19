import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: ReactNode;
}

const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    short: "ホーム",
    icon: (
      <svg viewBox="0 0 24 24" {...s}>
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "予定",
    short: "予定",
    icon: (
      <svg viewBox="0 0 24 24" {...s}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/scoreboard",
    label: "スコア",
    short: "スコア",
    icon: (
      <svg viewBox="0 0 24 24" {...s}>
        <ellipse cx="9" cy="8.5" rx="5.8" ry="6.5" />
        <path d="M9 15v6.2" />
        <circle cx="18" cy="17" r="2.4" />
      </svg>
    ),
  },
  {
    href: "/tournaments",
    label: "大会",
    short: "大会",
    icon: (
      <svg viewBox="0 0 24 24" {...s}>
        <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
        <path d="M8 5H5a3 3 0 0 0 3.2 4M16 5h3a3 3 0 0 1-3.2 4M12 13v4M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "その他",
    short: "その他",
    icon: (
      <svg viewBox="0 0 24 24" {...s}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    ),
  },
];
