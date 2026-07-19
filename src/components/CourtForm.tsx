"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "./MemberProvider";
import { createCourt, updateCourt, type CourtInput } from "@/app/actions";
import type { CourtRow } from "@/lib/types";

const label = "mb-1.5 block text-[13px] font-bold text-muted";
const field =
  "w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-primary";

export function CourtForm({ court }: { court?: CourtRow }) {
  const router = useRouter();
  const { member } = useMember();
  const editing = !!court;

  const [name, setName] = useState(court?.name ?? "");
  const [indoor, setIndoor] = useState<"outdoor" | "indoor" | "unset">(
    court?.is_indoor === true ? "indoor" : court?.is_indoor === false ? "outdoor" : "unset"
  );
  const [count, setCount] = useState(court?.court_count?.toString() ?? "");
  const [surface, setSurface] = useState(court?.surface ?? "");
  const [facilities, setFacilities] = useState(court?.facilities ?? "");
  const [fee, setFee] = useState(court?.fee ?? "");
  const [booking, setBooking] = useState(court?.booking ?? "");
  const [address, setAddress] = useState(court?.address ?? "");
  const [maps, setMaps] = useState(court?.maps_url ?? "");
  const [outdoorNote, setOutdoorNote] = useState(court?.outdoor_note ?? "");
  const [note, setNote] = useState(court?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("コート名を入力してください");
      return;
    }
    setBusy(true);
    setError(null);
    const input: CourtInput = {
      name,
      is_indoor: indoor === "indoor" ? true : indoor === "outdoor" ? false : null,
      court_count: count ? Math.max(0, parseInt(count, 10) || 0) : null,
      surface: surface || null,
      facilities: facilities || null,
      fee: fee || null,
      booking: booking || null,
      address: address || null,
      maps_url: maps || null,
      outdoor_note: indoor === "outdoor" ? outdoorNote || null : null,
      note: note || null,
    };
    try {
      if (editing && court) {
        await updateCourt(court.id, input, member?.id ?? null);
        router.push(`/courts/${court.id}`);
      } else {
        const id = await createCourt(input, member?.id ?? null);
        router.push(`/courts/${id}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href={editing && court ? `/courts/${court.id}` : "/courts"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold">
          {editing ? "コートを編集" : "コートを追加"}
        </h1>
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className={label}>コート名 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: Marina Sports Arena"
            className={field}
          />
        </div>

        <div>
          <label className={label}>屋内 / 屋外</label>
          <div className="flex gap-2">
            {[
              { k: "outdoor", l: "屋外" },
              { k: "indoor", l: "屋内" },
              { k: "unset", l: "未設定" },
            ].map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setIndoor(o.k as typeof indoor)}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold ${
                  indoor === o.k
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {indoor === "outdoor" && (
          <div>
            <label className={label}>風・日差しのメモ(屋外)</label>
            <input
              value={outdoorNote}
              onChange={(e) => setOutdoorNote(e.target.value)}
              placeholder="例: 午後は西日が強い。海風あり"
              className={field}
            />
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>面数</label>
            <input
              type="text"
              inputMode="numeric"
              value={count}
              onChange={(e) =>
                setCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
              }
              placeholder="4"
              className={field}
            />
          </div>
          <div className="flex-[2]">
            <label className={label}>路面</label>
            <input
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="ハード / 人工芝 / 体育館床 等"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label}>設備</label>
          <input
            value={facilities}
            onChange={(e) => setFacilities(e.target.value)}
            placeholder="ネット常設・ナイター可・駐車場あり 等"
            className={field}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>料金</label>
            <input
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="₹500 / 時間"
              className={field}
            />
          </div>
          <div className="flex-1">
            <label className={label}>予約方法</label>
            <input
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
              placeholder="電話(前日まで) 等"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label}>住所</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>地図リンク(Google Maps URL)</label>
          <input
            value={maps}
            onChange={(e) => setMaps(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className={field}
          />
        </div>
        <div>
          <label className={label}>メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="雨天時の状態、混雑時間帯など"
            rows={3}
            className={`${field} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="btn-pill w-full bg-primary py-3.5 text-[15px] text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : editing ? "変更を保存" : "コートを登録"}
        </button>
      </div>
    </div>
  );
}
