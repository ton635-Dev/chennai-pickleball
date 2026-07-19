"use client";

import { useEffect, useRef, useState } from "react";
import { useMember } from "./MemberProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { setMemberUpiQr, clearMemberUpiQr } from "@/app/actions";

const BUCKET = "upi-qr";

/**
 * 自分のUPIコード(QR画像)の登録・差し替え・削除。
 * コート代の立替者に選ばれたとき、活動詳細にこのQRが表示される。
 */
export function UpiQrManager() {
  const { member } = useMember();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.from("members")
      .select("upi_qr_url, upi_qr_path")
      .eq("id", member.id)
      .maybeSingle()
      .then(({ data }) => {
        setUrl(data?.upi_qr_url ?? null);
        setPath(data?.upi_qr_path ?? null);
        setLoaded(true);
      });
  }, [member]);

  if (!member) return null;

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const sb = getBrowserSupabase();
    if (!sb) {
      setError("Supabase が未設定です");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const newPath = `${member.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(newPath, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data } = sb.storage.from(BUCKET).getPublicUrl(newPath);
      // 旧画像は削除
      if (path) await sb.storage.from(BUCKET).remove([path]);
      await setMemberUpiQr(member.id, data.publicUrl, newPath);
      setUrl(data.publicUrl);
      setPath(newPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(true);
    try {
      if (path) await sb.storage.from(BUCKET).remove([path]);
      await clearMemberUpiQr(member.id);
      setUrl(null);
      setPath(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-1 text-[13px] font-bold text-muted">
        あなたのUPIコード(QR画像)
      </div>
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
        コート代の立替者に選ばれたとき、活動詳細にこのQRが表示され、参加者がUPIアプリで送金できます。GPay / PhonePe 等のQRのスクリーンショットを登録してください。
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files)}
      />

      {!loaded ? (
        <p className="py-2 text-center text-xs text-muted">読み込み中…</p>
      ) : url ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="あなたのUPIコード"
            className="h-32 w-32 rounded-xl border border-line bg-white object-contain"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn-pill border border-line bg-surface px-4 py-2 text-xs font-bold text-primary disabled:opacity-50"
            >
              {busy ? "処理中…" : "差し替え"}
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="btn-pill border border-line bg-surface px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-pill w-full border-2 border-dashed border-line bg-bg py-3 text-sm font-bold text-primary disabled:opacity-50"
        >
          {busy ? "アップロード中…" : "＋ UPIコードのQR画像を登録"}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
