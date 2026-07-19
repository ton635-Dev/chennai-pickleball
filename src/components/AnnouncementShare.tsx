"use client";

import { useState } from "react";
import { waShareLink } from "@/lib/whatsapp";

/**
 * 告知テキストを編集してから WhatsApp 共有するカード。
 * - 生成済みテキストを textarea に表示し、自由に編集できる(コメント追記・行の削除など)
 * - 「WhatsAppで共有」で wa.me を開く / 「コピー」でクリップボードへ
 */
export function AnnouncementShare({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const share = () => {
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

  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-muted">WhatsAppで告知</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-bold text-primary"
        >
          {open ? "閉じる" : "編集"}
        </button>
      </div>

      {open && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="mb-1 w-full resize-y rounded-xl border border-line bg-bg px-3.5 py-3 text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <p className="mb-3 text-[11px] text-muted">
            テキストは自由に編集できます(コメントの追記・不要な行の削除など)。
          </p>
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={share}
          className="btn-pill flex flex-1 items-center justify-center gap-2 bg-accent py-3.5 text-[15px] text-navy"
        >
          💬 WhatsAppで告知を共有
        </button>
        <button
          onClick={copy}
          className="btn-pill shrink-0 border border-line bg-surface px-4 text-[13px] font-bold text-muted"
          title="テキストをコピー"
        >
          {copied ? "コピー済" : "コピー"}
        </button>
      </div>
    </div>
  );
}
