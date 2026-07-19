import { EventForm } from "@/components/EventForm";
import { getCourtsForSelect } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const courts = await getCourtsForSelect();
  return <EventForm courts={courts} />;
}
