"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "./MemberProvider";
import { createEvent, updateEvent, type EventInput } from "@/app/actions";
import type { EventRow } from "@/lib/types";

interface CourtOption {
  id: string;
  name: string;
  maps_url: string | null;
}

interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  /** 編集時は既存イベント */
  event?: EventRow;
  courts?: CourtOption[];
  members?: MemberOption[];
}

/** ISO -> datetime-local 値(ローカル) */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

const label = "mb-1.5 block text-[13px] font-bold text-muted";
const field =
  "w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-primary";

export function EventForm({ event, courts = [], members = [] }: Props) {
  const router = useRouter();
  const { member } = useMember();
  const editing = !!event;

  const [date, setDate] = useState(event?.event_date ?? "");
  const [start, setStart] = useState(event?.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(event?.end_time?.slice(0, 5) ?? "");
  const [courtId, setCourtId] = useState(event?.court_id ?? "");
  const [place, setPlace] = useState(event?.place_name ?? "");
  const [maps, setMaps] = useState(event?.maps_url ?? "");

  // コートを選ぶと場所名・地図を自動補完
  const selectCourt = (id: string) => {
    setCourtId(id);
    const c = courts.find((c) => c.id === id);
    if (c) {
      setPlace(c.name);
      setMaps(c.maps_url ?? "");
    }
  };
  // コート使用費(合計)・割り勘人数・立替者
  const [courtFee, setCourtFee] = useState(
    event?.court_fee != null ? String(event.court_fee) : ""
  );
  const [splitCount, setSplitCount] = useState(
    event?.fee_split_count != null ? String(event.fee_split_count) : ""
  );
  const [payerId, setPayerId] = useState(event?.payer_member_id ?? "");
  const [deadline, setDeadline] = useState(
    toLocalInput(event?.rsvp_deadline ?? null)
  );
  const [note, setNote] = useState(event?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!date) {
      setError("日付を入力してください");
      return;
    }
    setBusy(true);
    setError(null);
    const input: EventInput = {
      event_date: date,
      start_time: start || null,
      end_time: end || null,
      court_id: courtId || null,
      place_name: place || null,
      maps_url: maps || null,
      court_fee: courtFee ? parseInt(courtFee, 10) : null,
      fee_split_count: splitCount ? Math.max(1, parseInt(splitCount, 10)) : null,
      payer_member_id: payerId || null,
      rsvp_deadline: deadline ? new Date(deadline).toISOString() : null,
      note: note || null,
    };
    try {
      if (editing && event) {
        await updateEvent(event.id, input, member?.id ?? null);
        router.push(`/events/${event.id}`);
      } else {
        const id = await createEvent(input, member?.id ?? null);
        router.push(`/events/${id}`);
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
          href={editing && event ? `/events/${event.id}` : "/schedule"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold">
          {editing ? "活動日を編集" : "活動日を作成"}
        </h1>
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className={label}>日付 *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>開始時刻</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={field}
            />
          </div>
          <div className="flex-1">
            <label className={label}>終了時刻</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={field}
            />
          </div>
        </div>
        {courts.length > 0 && (
          <div>
            <label className={label}>コートから選ぶ</label>
            <select
              value={courtId}
              onChange={(e) => selectCourt(e.target.value)}
              className={field}
            >
              <option value="">手動で入力</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={label}>場所名</label>
          <input
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              setCourtId(""); // 手動編集したらコート選択を解除
            }}
            placeholder="例: Marina Sports Arena・屋外4面"
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
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>コート使用費(合計・₹)</label>
            <input
              type="text"
              inputMode="numeric"
              value={courtFee}
              onChange={(e) =>
                setCourtFee(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="例: 1200"
              className={field}
            />
          </div>
          <div className="flex-1">
            <label className={label}>割り勘人数</label>
            <input
              type="text"
              inputMode="numeric"
              value={splitCount}
              onChange={(e) =>
                setSplitCount(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
              }
              placeholder="空欄=参加人数"
              className={field}
            />
          </div>
        </div>
        {courtFee && (
          <p className="-mt-2 text-[11px] text-muted">
            一人あたりの金額は活動詳細に自動表示されます(割り勘人数が空欄なら「参加」の人数で計算)。
          </p>
        )}

        {members.length > 0 && (
          <div>
            <label className={label}>コート代を支払う人(立替)</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className={field}
            >
              <option value="">選択しない</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted">
              選択すると活動詳細にその人のUPIコード(QR)が表示され、参加者が送金できます。
            </p>
          </div>
        )}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-bold text-muted">出欠締切</label>
            {deadline && (
              <button
                type="button"
                onClick={() => setDeadline("")}
                className="text-xs font-bold text-primary"
              >
                締切をなくす
              </button>
            )}
          </div>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={field}
          />
          {!deadline && (
            <p className="mt-1 text-[11px] text-muted">
              未設定(締切なし)。設定すると詳細に表示されます。
            </p>
          )}
        </div>
        <div>
          <label className={label}>メモ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: 初心者歓迎!ボールはこちらで用意します"
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
          {busy ? "保存中…" : editing ? "変更を保存" : "作成して告知する"}
        </button>
      </div>
    </div>
  );
}
