import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTournamentDetail,
  getMembers,
  getEventWithAttendance,
} from "@/lib/data";
import { EntryManager } from "@/components/EntryManager";
import { BracketView } from "@/components/BracketView";
import { LeagueView } from "@/components/LeagueView";
import { TournamentActions } from "@/components/TournamentActions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "準備中", cls: "bg-[#EDF1EF] text-muted" },
  ongoing: { label: "開催中", cls: "bg-accent text-navy" },
  done: { label: "終了", cls: "bg-[#E2F3EE] text-primary-dark" },
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getTournamentDetail(id);
  if (!detail || detail.tournament.archived) notFound();
  const { tournament, entries, matches } = detail;

  // draft のときだけ、参加者候補(メンバー名・活動日の参加者)を取得
  let memberNames: string[] = [];
  let eventParticipants: string[] = [];
  if (tournament.status === "draft") {
    const members = await getMembers();
    memberNames = members.map((m) => m.name);
    if (tournament.event_id) {
      const ev = await getEventWithAttendance(tournament.event_id);
      eventParticipants =
        ev?.attendances.filter((a) => a.status === "join").map((a) => a.member.name) ??
        [];
    }
  }

  const st = STATUS[tournament.status];

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-3 flex items-center gap-3">
        <Link
          href="/tournaments"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-extrabold">{tournament.name}</h1>
            <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${st.cls}`}>
              {st.label}
            </span>
          </div>
          <div className="text-[11px] text-muted">
            {tournament.format === "single_elim" ? "トーナメント" : "リーグ戦"}・
            {tournament.discipline === "doubles" ? "ダブルス" : "シングルス"}
          </div>
        </div>
        <TournamentActions
          tournamentId={tournament.id}
          canRegenerate={tournament.status !== "draft"}
        />
      </div>

      {tournament.status === "draft" ? (
        <EntryManager
          tournamentId={tournament.id}
          format={tournament.format}
          discipline={tournament.discipline}
          entries={entries}
          memberNames={memberNames}
          eventParticipants={eventParticipants}
        />
      ) : tournament.format === "single_elim" ? (
        <BracketView tournament={tournament} entries={entries} matches={matches} />
      ) : (
        <LeagueView tournament={tournament} entries={entries} matches={matches} />
      )}
    </div>
  );
}
