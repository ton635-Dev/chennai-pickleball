import { formatDateJa } from "@/lib/format";
import { MatchDeleteButton } from "./MatchDeleteButton";
import type { MatchRow as Match } from "@/lib/types";

interface Props {
  match: Match & {
    event?: { id: string; event_date: string; place_name: string | null } | null;
  };
  showEvent?: boolean;
  showDelete?: boolean;
}

export function MatchRow({ match, showEvent = false, showDelete = true }: Props) {
  const t1 = match.team1_names.join("・") || "チーム1";
  const t2 = match.team2_names.join("・") || "チーム2";
  const w1 = match.winner === 1;
  const w2 = match.winner === 2;
  const modeLabel = match.mode === "doubles" ? "ダブルス" : "シングルス";
  const dateStr = formatDateJa(match.created_at.slice(0, 10));

  const meta: string[] = [`${modeLabel}・${match.target_points}点`];
  if (showEvent && match.event) {
    meta.push(
      `${formatDateJa(match.event.event_date)}${
        match.event.place_name ? ` ${match.event.place_name}` : ""
      }`
    );
  } else {
    meta.push(dateStr);
  }

  return (
    <div className="border-b border-line py-3 last:border-none">
      <div className="flex items-center gap-2 text-sm">
        <span className={`flex-1 text-right ${w1 ? "font-extrabold" : ""}`}>
          {w1 && <span className="mr-1 text-amber">🏆</span>}
          {t1}
        </span>
        <b className="tabnum shrink-0 rounded-lg bg-navy px-2.5 py-1 text-sm text-accent">
          {match.team1_score} - {match.team2_score}
        </b>
        <span className={`flex-1 ${w2 ? "font-extrabold" : ""}`}>
          {t2}
          {w2 && <span className="ml-1 text-amber">🏆</span>}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-muted">
        <span>{meta.join("・")}</span>
        {showDelete && <MatchDeleteButton matchId={match.id} />}
      </div>
    </div>
  );
}
