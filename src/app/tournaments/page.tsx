import Link from "next/link";
import { getTournaments } from "@/lib/data";
import { EmptyState } from "@/components/bits";
import type { TournamentSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

const FORMAT_LABEL: Record<string, string> = {
  single_elim: "トーナメント",
  round_robin: "リーグ戦",
  team_league: "団体戦",
};
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "準備中", cls: "bg-[#EDF1EF] text-muted" },
  ongoing: { label: "開催中", cls: "bg-accent text-navy" },
  done: { label: "終了", cls: "bg-[#E2F3EE] text-primary-dark" },
};

function Card({ t }: { t: TournamentSummary }) {
  const st = STATUS[t.status];
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="card mb-2.5 flex items-center gap-3 p-4"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <b className="text-[15px]">{t.name}</b>
          <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold ${st.cls}`}>
            {st.label}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted">
          {FORMAT_LABEL[t.format]}・
          {t.discipline === "doubles" ? "ダブルス" : "シングルス"}・
          {t.entryCount}組
        </div>
        {t.status === "done" && t.champion && (
          <div className="mt-1 text-[13px] font-bold text-primary-dark">
            🏆 優勝: {t.champion}
          </div>
        )}
      </div>
      <span className="text-muted">›</span>
    </Link>
  );
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments();
  const ongoing = tournaments.filter((t) => t.status === "ongoing");
  const draft = tournaments.filter((t) => t.status === "draft");
  const done = tournaments.filter((t) => t.status === "done");

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold">大会</h1>
        <Link
          href="/tournaments/new"
          className="btn-pill bg-primary px-5 py-2.5 text-sm text-white"
        >
          ＋ 大会を作成
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          title="大会はまだありません"
          hint="「＋ 大会を作成」からトーナメント/リーグ戦を作れます"
        />
      ) : (
        <>
          {ongoing.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-2 text-sm font-extrabold text-muted">開催中</h2>
              {ongoing.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </section>
          )}
          {draft.length > 0 && (
            <section className="mb-4">
              <h2 className="mb-2 text-sm font-extrabold text-muted">準備中</h2>
              {draft.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-extrabold text-muted">過去の大会</h2>
              {done.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
