import { EventForm } from "@/components/EventForm";
import { getCourtsForSelect, getMembers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const [courts, members] = await Promise.all([
    getCourtsForSelect(),
    getMembers(),
  ]);
  return (
    <EventForm
      courts={courts}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
