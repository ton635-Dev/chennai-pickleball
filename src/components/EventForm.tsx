"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "./MemberProvider";
import { createEvent, updateEvent, type EventInput } from "@/app/actions";
import type { EventRow } from "@/lib/types";

interface Props {
  /** 編集時は既存イベント */
  event?: EventRow;
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

export function EventForm({ event }: Props) {
  const router = useRouter();
  const { member } = useMember();
  const editing = !!event;

  const [date, setDate] = useState(event?.event_date ?? "");
  const [start, setStart] = useState(event?.start_time?.slice(0, 5) ?? "");
  const [end, setEnd] = useState(event?.end_time?.slice(0, 5) ?? "");
  const [place, setPlace] = useState(event?.place_name ?? "");
  const [maps, setMaps] = useState(event?.maps_url ?? "");
  const [fee, setFee] = useState(event?.fee ?? "");
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
      place_name: place || null,
      maps_url: maps || null,
      fee: fee || null,
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
        <div>
          <label className={label}>場所名</label>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
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
        <div>
          <label className={label}>参加費</label>
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="例: ₹250(コート代割り勘)"
            className={field}
          />
        </div>
        <div>
          <label className={label}>出欠締切</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={field}
          />
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
