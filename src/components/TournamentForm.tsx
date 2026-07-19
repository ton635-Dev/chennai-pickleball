"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember } from "./MemberProvider";
import { createTournament } from "@/app/actions";
import type { TournamentFormat } from "@/lib/types";

interface EventOpt {
  id: string;
  label: string;
}

const label = "mb-1.5 block text-[13px] font-bold text-muted";
const field =
  "w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-primary";

export function TournamentForm({ events = [] }: { events?: EventOpt[] }) {
  const router = useRouter();
  const { member } = useMember();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("single_elim");
  const [discipline, setDiscipline] = useState<"singles" | "doubles">("doubles");
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("大会名を入力してください");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createTournament(
        { name, format, discipline, event_id: eventId || null },
        member?.id ?? null
      );
      router.push(`/tournaments/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
      setBusy(false);
    }
  };

  const Seg = <T extends string>({
    value,
    set,
    options,
  }: {
    value: T;
    set: (v: T) => void;
    options: { k: T; l: string }[];
  }) => (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => set(o.k)}
          className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold ${
            value === o.k
              ? "border-primary bg-primary text-white"
              : "border-line bg-surface text-muted"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/tournaments"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <h1 className="text-lg font-extrabold">大会を作成</h1>
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className={label}>大会名 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 第3回 チェンナイ杯"
            className={field}
          />
        </div>
        <div>
          <label className={label}>形式</label>
          <Seg
            value={format}
            set={setFormat}
            options={[
              { k: "single_elim", l: "トーナメント" },
              { k: "round_robin", l: "リーグ戦(総当たり)" },
            ]}
          />
        </div>
        <div>
          <label className={label}>種目</label>
          <Seg
            value={discipline}
            set={setDiscipline}
            options={[
              { k: "doubles", l: "ダブルス" },
              { k: "singles", l: "シングルス" },
            ]}
          />
        </div>
        {events.length > 0 && (
          <div>
            <label className={label}>活動日に紐づけ(任意)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className={field}
            >
              <option value="">紐づけない</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="btn-pill w-full bg-primary py-3.5 text-[15px] text-white disabled:opacity-50"
        >
          {busy ? "作成中…" : "作成して参加者を登録"}
        </button>
      </div>
    </div>
  );
}
