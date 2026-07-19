"use client";

import { useState } from "react";

interface Props {
  name: string;
  qrUrl: string | null;
}

/**
 * コート代の立替者表示 + UPIコード(QR)の展開表示。
 * インドの UPI(GPay / PhonePe / Paytm 等)で読み取って送金する想定。
 */
export function PayerUpiSection({ name, qrUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line py-2.5 text-sm last:border-none">
      <div className="flex items-center gap-2">
        <span className="w-5 text-center">💳</span>
        <span>
          コート代立替: <b>{name}</b>
        </span>
        {qrUrl ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto shrink-0 rounded-pill bg-primary px-3.5 py-1.5 text-xs font-extrabold text-white"
          >
            {open ? "閉じる" : "UPIコード表示"}
          </button>
        ) : (
          <span className="ml-auto shrink-0 text-[11px] text-muted">
            UPIコード未登録
          </span>
        )}
      </div>
      {open && qrUrl && (
        <div className="mt-3 flex flex-col items-center gap-1.5 pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`${name}のUPIコード`}
            className="w-60 max-w-full rounded-xl border border-line bg-white"
          />
          <p className="text-[11px] text-muted">
            UPIアプリ(GPay / PhonePe 等)でスキャンして送金
          </p>
        </div>
      )}
    </div>
  );
}
