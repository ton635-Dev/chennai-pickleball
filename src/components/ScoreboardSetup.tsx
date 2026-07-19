"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NameSuggestInput } from "./NameSuggestInput";

const PRESETS = [3, 5, 11];

export interface EventOption {
  id: string;
  label: string;
}

interface Props {
  events?: EventOption[];
  memberNames?: string[];
}

export function ScoreboardSetup({ events = [], memberNames = [] }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"singles" | "doubles">("doubles");
  const [targetText, setTargetText] = useState("11");
  const [t1, setT1] = useState<string[]>(["", ""]);
  const [t2, setT2] = useState<string[]>(["", ""]);
  const [eventId, setEventId] = useState("");

  const targetNum = Math.max(1, parseInt(targetText, 10) || 11);

  const names = (arr: string[]) =>
    (mode === "doubles" ? arr : arr.slice(0, 1))
      .map((n) => n.trim())
      .filter(Boolean);

  const start = () => {
    const params = new URLSearchParams({
      mode,
      target: String(targetNum),
      t1: names(t1).join(","),
      t2: names(t2).join(","),
    });
    if (eventId) params.set("event", eventId);
    router.push(`/scoreboard/play?${params.toString()}`);
  };

  const input =
    "w-full rounded-xl border border-line bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-primary";

  return (
    <div className="mx-auto w-full max-w-md pt-1">
      <h1 className="mb-1 text-[22px] font-extrabold">スコアボード</h1>
      <p className="mb-5 text-sm text-muted">
        サイドアウト式。ラリーに勝った側をタップするだけで、サーブ権・サーバー番号・サイドアウトは自動判定します。
      </p>

      <div className="card space-y-5 p-4">
        {/* 種目 */}
        <div>
          <div className="mb-2 text-[13px] font-bold text-muted">種目</div>
          <div className="flex gap-2 rounded-xl bg-[#EDF1EF] p-1">
            {(["doubles", "singles"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${
                  mode === m ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                {m === "doubles" ? "ダブルス" : "シングルス"}
              </button>
            ))}
          </div>
        </div>

        {/* 点数 */}
        <div>
          <div className="mb-2 text-[13px] font-bold text-muted">
            ゲーム点数(2点差で終了)
          </div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setTargetText(String(p))}
                className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-extrabold ${
                  parseInt(targetText, 10) === p
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {p}点
              </button>
            ))}
            <input
              type="text"
              inputMode="numeric"
              value={targetText}
              onChange={(e) =>
                setTargetText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
              }
              onBlur={() => {
                if (!targetText || parseInt(targetText, 10) < 1)
                  setTargetText("11");
              }}
              placeholder="11"
              aria-label="ゲーム点数(任意)"
              className="w-20 rounded-xl border border-line bg-bg px-3 py-2.5 text-center text-sm font-extrabold outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 名前(任意) */}
        <div>
          <div className="mb-2 text-[13px] font-bold text-muted">
            チーム名・選手名(任意)
          </div>
          <div className="space-y-2">
            <div className="rounded-xl bg-bg p-2.5">
              <div className="mb-1.5 text-[11px] font-bold text-primary-dark">
                チーム1
              </div>
              <div className="flex gap-2">
                <NameSuggestInput
                  value={t1[0]}
                  onChange={(v) => setT1([v, t1[1]])}
                  suggestions={memberNames}
                  exclude={[t1[1], t2[0], t2[1]]}
                  placeholder="選手A"
                  className={input}
                />
                {mode === "doubles" && (
                  <NameSuggestInput
                    value={t1[1]}
                    onChange={(v) => setT1([t1[0], v])}
                    suggestions={memberNames}
                    exclude={[t1[0], t2[0], t2[1]]}
                    placeholder="選手B"
                    className={input}
                  />
                )}
              </div>
            </div>
            <div className="rounded-xl bg-bg p-2.5">
              <div className="mb-1.5 text-[11px] font-bold text-muted">
                チーム2
              </div>
              <div className="flex gap-2">
                <NameSuggestInput
                  value={t2[0]}
                  onChange={(v) => setT2([v, t2[1]])}
                  suggestions={memberNames}
                  exclude={[t1[0], t1[1], t2[1]]}
                  placeholder="選手C"
                  className={input}
                />
                {mode === "doubles" && (
                  <NameSuggestInput
                    value={t2[1]}
                    onChange={(v) => setT2([t2[0], v])}
                    suggestions={memberNames}
                    exclude={[t1[0], t1[1], t2[0]]}
                    placeholder="選手D"
                    className={input}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 活動日に紐づけ(任意) */}
        {events.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">
              活動日に紐づけ(任意・保存時に記録)
            </div>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className={input}
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

        <button
          onClick={start}
          className="btn-pill w-full bg-primary py-3.5 text-base text-white"
        >
          試合を開始
        </button>
        <p className="text-center text-xs text-muted">
          記録なしのクイックマッチ。終了後に結果を保存できます。
        </p>
      </div>
    </div>
  );
}
