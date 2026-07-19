"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  formatDateJa,
  formatTimeRange,
  parseDate,
  weekdayJa,
} from "@/lib/format";
import { MyRsvpChip } from "./MyRsvpChip";
import { EmptyState } from "./bits";
import type { AttendanceStatus, EventWithAttendance } from "@/lib/types";

function statusMap(ev: EventWithAttendance): Record<string, AttendanceStatus> {
  const m: Record<string, AttendanceStatus> = {};
  for (const a of ev.attendances) m[a.member_id] = a.status;
  return m;
}

function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate()
  ).padStart(2, "0")}`;
}

function EventRow({ ev }: { ev: EventWithAttendance }) {
  return (
    <Link
      href={`/events/${ev.id}`}
      className="flex items-center gap-3.5 border-b border-line py-3 last:border-none"
    >
      <div className="w-12 shrink-0 rounded-[10px] bg-[#EDF4F1] py-1.5 text-center">
        <b className="block text-[17px] leading-tight">
          {formatDateJa(ev.event_date).split(" ")[0]}
        </b>
        <span className="text-[11px] text-muted">{weekdayJa(ev.event_date)}</span>
      </div>
      <div className="flex-1">
        <b className="block text-sm">{ev.place_name || "場所未定"}</b>
        <span className="text-xs text-muted">
          {formatTimeRange(ev.start_time, ev.end_time)}・参加 {ev.counts.join}名
        </span>
      </div>
      <MyRsvpChip statusByMember={statusMap(ev)} />
    </Link>
  );
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];

function Calendar({ events }: { events: EventWithAttendance[] }) {
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, EventWithAttendance[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [events]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d: number) =>
    `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
  const today = todayStr();

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const nm = c.m + delta;
      return { y: c.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div>
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => move(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted"
          >
            ‹
          </button>
          <div className="text-[15px] font-extrabold">
            {cursor.y}年 {cursor.m + 1}月
          </div>
          <button
            onClick={() => move(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          {WD.map((w, i) => (
            <div
              key={w}
              className={`pb-2 text-[11px] font-bold ${
                i === 0 ? "text-red-500" : i === 6 ? "text-primary" : "text-muted"
              }`}
            >
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const ds = dateStr(d);
            const has = byDate.has(ds);
            const isToday = ds === today;
            const isSel = ds === selected;
            return (
              <button
                key={ds}
                onClick={() => has && setSelected(isSel ? null : ds)}
                className={`relative mx-auto my-0.5 flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm ${
                  isSel
                    ? "bg-primary font-extrabold text-white"
                    : isToday
                      ? "font-extrabold text-primary"
                      : has
                        ? "font-bold text-ink"
                        : "text-muted"
                }`}
              >
                {d}
                {has && !isSel && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="card mt-3 p-4">
          <h2 className="mb-2 text-sm font-extrabold text-muted">
            {formatDateJa(selected)} の活動
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted">予定なし</p>
          ) : (
            selectedEvents.map((ev) => <EventRow key={ev.id} ev={ev} />)
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleView({ events }: { events: EventWithAttendance[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const today = todayStr();
  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events
    .filter((e) => e.event_date < today)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1 rounded-xl bg-[#EDF1EF] p-1">
          {(["list", "calendar"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                view === v ? "bg-surface text-ink shadow-sm" : "text-muted"
              }`}
            >
              {v === "list" ? "リスト" : "カレンダー"}
            </button>
          ))}
        </div>
        <Link
          href="/events/new"
          className="btn-pill bg-primary px-5 py-2.5 text-sm text-white"
        >
          ＋ 作成
        </Link>
      </div>

      {view === "calendar" ? (
        <Calendar events={events} />
      ) : (
        <div>
          <div className="card mb-3 p-4">
            <h2 className="mb-2.5 text-sm font-extrabold text-muted">今後の予定</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="今後の予定はありません" />
            ) : (
              upcoming.map((ev) => <EventRow key={ev.id} ev={ev} />)
            )}
          </div>
          {past.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-2.5 text-sm font-extrabold text-muted">
                過去の活動
              </h2>
              {past.map((ev) => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
