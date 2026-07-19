import { Scoreboard } from "@/components/Scoreboard";

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
  }>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "singles" ? "singles" : "doubles";
  const target = Math.max(1, Number(sp.target) || 11);
  const parse = (s?: string) =>
    (s ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

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
