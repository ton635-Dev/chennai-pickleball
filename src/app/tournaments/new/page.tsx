import { TournamentForm } from "@/components/TournamentForm";
import { getEventsWithAttendance } from "@/lib/data";
import { formatDateJa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage() {
  const events = await getEventsWithAttendance();
  const opts = [...events]
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      label: `${formatDateJa(e.event_date)}${e.place_name ? ` ${e.place_name}` : ""}`,
    }));
  return <TournamentForm events={opts} />;
}
