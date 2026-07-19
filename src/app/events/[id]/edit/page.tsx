import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCourtsForSelect, getMembers } from "@/lib/data";
import { EventForm } from "@/components/EventForm";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();
  const [{ data }, courts, members] = await Promise.all([
    sb.from("events").select("*").eq("id", id).maybeSingle(),
    getCourtsForSelect(),
    getMembers(),
  ]);
  if (!data) notFound();
  return (
    <EventForm
      event={data as EventRow}
      courts={courts}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}
