import { ScoreboardSetup, type EventOption } from "@/components/ScoreboardSetup";
import { getEventsWithAttendance, getMembers } from "@/lib/data";
import { formatDateJa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage() {
  const [events, members] = await Promise.all([
    getEventsWithAttendance(),
    getMembers(),
  ]);

  // 直近の活動日(新しい順・最大10件)を紐づけ候補に
  const eventOptions: EventOption[] = [...events]
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      label: `${formatDateJa(e.event_date)}${e.place_name ? ` ${e.place_name}` : ""}`,
    }));

  return (
    <ScoreboardSetup
      events={eventOptions}
      memberNames={members.map((m) => m.name)}
    />
  );
}
