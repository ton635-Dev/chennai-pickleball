"use client";

// 時刻を「時」「分(15分刻み)」の2つのセレクトで選ぶ。値は "HH:MM"(空=未設定)。
// 15分刻み以外の既存値(古い予定など)は選択肢に加えて保持する。

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  "aria-label"?: string;
}

export function TimeSelect({ value, onChange, className, ...rest }: Props) {
  const [hh = "", mm = ""] = value ? value.split(":") : [];
  const minutes = mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES;

  const setHour = (h: string) => {
    if (!h) return onChange("");
    onChange(`${h}:${mm || "00"}`);
  };
  const setMinute = (m: string) => {
    if (!hh) return;
    onChange(`${hh}:${m}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hh}
        onChange={(e) => setHour(e.target.value)}
        className={className}
        aria-label={rest["aria-label"] ? `${rest["aria-label"]}(時)` : "時"}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm font-bold text-muted">:</span>
      <select
        value={mm}
        onChange={(e) => setMinute(e.target.value)}
        disabled={!hh}
        className={className}
        aria-label={rest["aria-label"] ? `${rest["aria-label"]}(分)` : "分"}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
