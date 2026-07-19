"use client";

import { useState } from "react";
import { waShareLink } from "@/lib/whatsapp";

interface Props {
  text: string;
  label: string;
  /** compact: ホームヒーロー(暗背景)向け / mini: 白背景の小型セカンダリ */
  size?: "full" | "compact" | "mini";
  className?: string;
}

/**
 * WhatsApp共有ボタン。タップで wa.me を開く。
 * 長押し/副操作の代わりに「コピー」も提供(貼り付け運用向け)。
 */
export function ShareButton({ text, label, size = "full", className }: Props) {
  const [copied, setCopied] = useState(false);

  const openWhatsApp = () => {
    window.open(waShareLink(text), "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  if (size === "mini") {
    return (
      <button
        onClick={openWhatsApp}
        className={`btn-pill border border-line bg-surface px-3.5 py-1.5 text-xs text-primary ${className ?? ""}`}
      >
        💬 {label}
      </button>
    );
  }

  if (size === "compact") {
    return (
      <button
        onClick={openWhatsApp}
        className={`btn-pill bg-white/90 px-5 py-2.5 text-[13px] text-primary-dark ${className ?? ""}`}
      >
        💬 {label}
      </button>
    );
  }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <button
        onClick={openWhatsApp}
        className="btn-pill flex flex-1 items-center justify-center gap-2 bg-accent py-3.5 text-[15px] text-navy"
      >
        💬 {label}
      </button>
      <button
        onClick={copy}
        className="btn-pill shrink-0 border border-line bg-surface px-4 text-[13px] font-bold text-muted"
        title="テキストをコピー"
      >
        {copied ? "コピー済" : "コピー"}
      </button>
    </div>
  );
}
