import { Scoreboard } from "@/components/Scoreboard";
import { getTieForScoreboard } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    target?: string;
    t1?: string;
    t2?: string;
    event?: string;
    /** 大会の対戦ID(団体戦のゲームを記録するモード) */
    tie?: string;
    /** 大会モードでのゲーム番号 */
    g?: string;
  }>;
}) {
  const sp = await searchParams;
  const parse = (s?: string) =>
    (s ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  // 大会モード: 対戦情報から設定・チーム名を引き継ぐ
  if (sp.tie) {
    const tie = await getTieForScoreboard(sp.tie);
    if (tie) {
      const gameNo = Math.min(
        Math.max(1, Number(sp.g) || 1),
        tie.gamesPerTie
      );
      const g = tie.games.find((x) => x.g === gameNo);
      // 出場ペアが指定済みならチーム名に使う(未指定はチーム名)
      const label = (pair: string | null | undefined, teamName: string) =>
        pair && pair.trim() ? pair.split("・").map((s) => s.trim()) : [teamName];
      return (
        <Scoreboard
          // ゲームが変わったら状態を作り直す(前ゲームのスコアが残らないように)
          key={`${sp.tie}-${gameNo}`}
          mode="doubles"
          target={tie.pointsPerGame}
          team1={label(g?.p1, tie.name1)}
          team2={label(g?.p2, tie.name2)}
          eventId={null}
          tie={{
            matchId: sp.tie,
            tournamentId: tie.tournamentId,
            tournamentName: tie.tournamentName,
            gameNo,
            gamesPerTie: tie.gamesPerTie,
            teamName1: tie.name1,
            teamName2: tie.name2,
          }}
        />
      );
    }
  }

  const mode = sp.mode === "singles" ? "singles" : "doubles";
  const target = Math.max(1, Number(sp.target) || 11);

  return (
    <Scoreboard
      mode={mode}
      target={target}
      team1={parse(sp.t1)}
      team2={parse(sp.t2)}
      eventId={sp.event || null}
    />
  );
}
