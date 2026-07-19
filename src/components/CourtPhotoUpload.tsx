"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { addCourtPhoto, deleteCourtPhoto } from "@/app/actions";
import type { CourtPhoto } from "@/lib/types";

const BUCKET = "court-photos";

export function CourtPhotoUpload({
  courtId,
  photos,
}: {
  courtId: string;
  photos: CourtPhoto[];
}) {
  const router = useRouter();
  const { member } = useMember();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState<CourtPhoto | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const sb = getBrowserSupabase();
    if (!sb) {
      setError("Supabase が未設定です");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${courtId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await sb.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
        await addCourtPhoto(courtId, data.publicUrl, path, member?.id ?? null);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    const photo = confirmPhoto;
    if (!photo) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    setBusy(true);
    try {
      if (photo.storage_path) {
        await sb.storage.from(BUCKET).remove([photo.storage_path]);
      }
      await deleteCourtPhoto(photo.id, courtId);
      setConfirmPhoto(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-muted">写真</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-pill border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-primary disabled:opacity-50"
        >
          {busy ? "処理中…" : "＋ 写真を追加"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {photos.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted">
          写真はまだありません
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="コート写真"
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                onClick={() => setConfirmPhoto(p)}
                disabled={busy}
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-base text-white shadow"
                aria-label="写真を削除"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs p-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={confirmPhoto.url}
              alt="削除する写真"
              className="mx-auto mb-3 h-28 w-28 rounded-lg object-cover"
            />
            <p className="text-[15px] font-bold">この写真を削除しますか?</p>
            <p className="mt-1 text-xs text-muted">元に戻せません。</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmPhoto(null)}
                disabled={busy}
                className="btn-pill flex-1 border border-line bg-surface py-2.5 text-sm text-muted"
              >
                キャンセル
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="btn-pill flex-1 bg-red-600 py-2.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
