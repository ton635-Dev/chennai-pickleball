"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMember } from "./MemberProvider";
import { TimeSelect } from "./TimeSelect";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SUPABASE_SCHEMA } from "@/lib/supabase/config";
import {
  createBoardPost,
  updateBoardPost,
  findBoardPostsOnDate,
  fetchBoardUrlPreview,
  type BoardPostInput,
} from "@/app/actions";
import { CATEGORIES, CATEGORY_LABEL, KIND_LABEL, usesPairing } from "@/lib/board";
import type { BoardCategory, BoardKind, BoardPost } from "@/lib/types";

const BUCKET = "board-images";
const label = "mb-1 block text-xs font-extrabold text-muted";
const input =
  "w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none focus:border-primary";

/** スマホ写真は大きいので、長辺1600pxのJPEGに縮小してから送る */
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function BoardPostForm({ post }: { post?: BoardPost }) {
  const router = useRouter();
  const { member } = useMember();
  const editing = !!post;

  const [kind, setKind] = useState<BoardKind>(post?.kind ?? "external");
  const [title, setTitle] = useState(post?.title ?? "");
  const [url, setUrl] = useState(post?.url ?? "");
  const [startDate, setStartDate] = useState(post?.start_date ?? "");
  const [endDate, setEndDate] = useState(post?.end_date ?? "");
  const [startTime, setStartTime] = useState(post?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(post?.end_time?.slice(0, 5) ?? "");
  const [place, setPlace] = useState(post?.place_name ?? "");
  const [maps, setMaps] = useState(post?.maps_url ?? "");
  const [deadline, setDeadline] = useState(post?.entry_deadline ?? "");
  const [categories, setCategories] = useState<BoardCategory[]>(post?.categories ?? []);
  const [level, setLevel] = useState(post?.level ?? "");
  const [fee, setFee] = useState(post?.fee ?? "");
  const [note, setNote] = useState(post?.note ?? "");
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? "");
  const [imagePath, setImagePath] = useState(post?.image_path ?? "");
  const uploadedThisSession = useRef<string | null>(null);
  const [seekingSelf, setSeekingSelf] = useState(false);

  const [dupes, setDupes] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pairing = usesPairing(kind);

  // 同じ開催日の投稿があれば知らせる(重複投稿の防止)
  useEffect(() => {
    let cancelled = false;
    if (!startDate) {
      setDupes([]);
      return;
    }
    findBoardPostsOnDate(startDate, post?.id ?? null).then((list) => {
      if (!cancelled) setDupes(list);
    });
    return () => {
      cancelled = true;
    };
  }, [startDate, post?.id]);

  const toggleCategory = (c: BoardCategory) =>
    setCategories((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const importFromUrl = async () => {
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetchBoardUrlPreview(url);
      if (res.error) {
        setFetchMsg(res.error);
        return;
      }
      if (res.title && !title.trim()) setTitle(res.title);
      if (res.description && !note.trim()) setNote(res.description);
      setFetchMsg(
        res.title || res.description
          ? "ページの情報を取り込みました。日付などは確認して入力してください"
          : "取り込める情報がありませんでした"
      );
    } catch {
      setFetchMsg("ページを読み込めませんでした。手入力してください");
    } finally {
      setFetching(false);
    }
  };

  const onImage = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    setImgBusy(true);
    setError(null);
    try {
      const blob = await shrinkImage(file);
      const path = `${SUPABASE_SCHEMA}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await sb.storage
        .from(BUCKET)
        .upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      // 差し替えた場合、この画面で上げた前の画像は不要なので消す
      if (uploadedThisSession.current) {
        await sb.storage.from(BUCKET).remove([uploadedThisSession.current]);
      }
      uploadedThisSession.current = path;
      setImageUrl(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      setImagePath(path);
    } catch (e) {
      setError(`画像を送れませんでした: ${e instanceof Error ? e.message : ""}`);
    } finally {
      setImgBusy(false);
    }
  };

  const removeImage = async () => {
    // この画面で上げた画像だけ実ファイルも消す(編集をやめたとき元の画像が残るように)
    if (uploadedThisSession.current) {
      await getBrowserSupabase()?.storage.from(BUCKET).remove([uploadedThisSession.current]);
      uploadedThisSession.current = null;
    }
    setImageUrl("");
    setImagePath("");
  };

  const submit = async () => {
    if (!title.trim()) return setError("タイトルを入力してください");
    if (!startDate) return setError("開催日を入力してください");
    if (endDate && endDate < startDate) return setError("終了日は開始日以降にしてください");
    setBusy(true);
    setError(null);
    const data: BoardPostInput = {
      kind,
      title,
      start_date: startDate,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      place_name: place || null,
      maps_url: maps || null,
      url: url || null,
      entry_deadline: deadline || null,
      categories: pairing ? categories : [],
      level: level || null,
      fee: fee || null,
      note: note || null,
      image_url: imageUrl || null,
      image_path: imagePath || null,
    };
    try {
      if (editing && post) {
        const res = await updateBoardPost(post.id, data, member?.id ?? null);
        if (res.error) {
          setError(res.error);
          setBusy(false);
          return;
        }
        router.push(`/tournaments/board/${post.id}`);
      } else {
        const res = await createBoardPost(data, member?.id ?? null, pairing && seekingSelf);
        if (res.error || !res.id) {
          setError(res.error ?? "投稿できませんでした");
          setBusy(false);
          return;
        }
        // 投稿直後は詳細画面でWhatsApp告知を案内する
        router.push(`/tournaments/board/${res.id}?posted=1`);
      }
      router.refresh();
    } catch {
      setError("通信に失敗しました。電波の良い場所で、もう一度お試しください");
      setBusy(false);
    }
  };

  const chip = (on: boolean) =>
    `rounded-pill px-3 py-1.5 text-xs font-bold ${
      on ? "bg-primary text-white" : "border border-line bg-surface text-muted"
    }`;

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href={editing && post ? `/tournaments/board/${post.id}` : "/tournaments/board"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold">
          {editing ? "投稿を編集" : "大会・イベントを投稿"}
        </h1>
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className={label}>種類</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KIND_LABEL) as BoardKind[]).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={chip(kind === k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>大会URL(TurfTownなどの申込ページ)</label>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              placeholder="https://turftown.in/..."
              className={`${input} min-w-0 flex-1`}
            />
            <button
              type="button"
              onClick={importFromUrl}
              disabled={fetching || !/^https?:\/\//i.test(url.trim())}
              className="btn-pill shrink-0 border border-line bg-surface px-3 text-xs text-primary-dark disabled:opacity-40"
            >
              {fetching ? "取得中…" : "情報を取り込む"}
            </button>
          </div>
          {fetchMsg && <p className="mt-1 text-[11px] text-muted">{fetchMsg}</p>}
        </div>

        <div>
          <label className={label}>タイトル *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "circle" ? "例: ポンディシェリ合宿" : "例: Chennai Open 2026"}
            className={input}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>開始日 *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>終了日(複数日のとき)</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={input}
            />
          </div>
        </div>
        {dupes.length > 0 && (
          <div className="-mt-2 rounded-xl bg-[#FAEEDA] px-3 py-2 text-xs text-[#633806]">
            同じ日の投稿があります:
            {dupes.map((d) => (
              <Link
                key={d.id}
                href={`/tournaments/board/${d.id}`}
                className="ml-1 font-extrabold underline"
              >
                「{d.title}」
              </Link>
            ))}
            。この大会ではありませんか？
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>開始時刻</label>
            <TimeSelect value={startTime} onChange={setStartTime} aria-label="開始時刻" />
          </div>
          <div>
            <label className={label}>終了時刻</label>
            <TimeSelect value={endTime} onChange={setEndTime} aria-label="終了時刻" />
          </div>
        </div>

        <div>
          <label className={label}>場所</label>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="例: Velachery Arena"
            className={input}
          />
        </div>
        <div>
          <label className={label}>地図リンク(Google マップのURL)</label>
          <input
            value={maps}
            onChange={(e) => setMaps(e.target.value)}
            inputMode="url"
            placeholder="https://maps.app.goo.gl/..."
            className={input}
          />
        </div>

        {pairing && (
          <div>
            <label className={label}>種目(複数選択可)</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={chip(categories.includes(c))}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>申込締切</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>参加費</label>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="例: ₹800/人"
              className={input}
            />
          </div>
        </div>

        {pairing && (
          <div>
            <label className={label}>レベル帯</label>
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="例: DUPR 3.0〜3.5 / 初心者クラスあり"
              className={input}
            />
          </div>
        )}

        <div>
          <label className={label}>メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="申込方法、持ち物、集合方法など"
            className={input}
          />
        </div>

        <div>
          <label className={label}>チラシ・画像(任意)</label>
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="チラシ"
                className="max-h-64 w-full rounded-xl border border-line object-contain"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 rounded-pill bg-black/60 px-3 py-1 text-xs font-bold text-white"
              >
                外す
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-bg py-4 text-sm font-bold text-primary-dark">
              {imgBusy ? "送信中…" : "＋ 画像を選ぶ"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={imgBusy}
                onChange={(e) => {
                  onImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {!editing && pairing && (
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={seekingSelf}
              onChange={(e) => setSeekingSelf(e.target.checked)}
              className="h-4 w-4 accent-[#0E7C63]"
            />
            自分もペアを探している
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || imgBusy}
          className="btn-pill w-full bg-primary py-3.5 text-[15px] text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : editing ? "保存する" : "投稿する"}
        </button>
        {!editing && (
          <p className="text-center text-[11px] text-muted">
            投稿後に WhatsApp グループへ告知できます
          </p>
        )}
      </div>
    </div>
  );
}
