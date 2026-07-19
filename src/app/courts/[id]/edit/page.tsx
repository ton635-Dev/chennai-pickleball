import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { CourtForm } from "@/components/CourtForm";
import type { CourtRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditCourtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getServerSupabase();
  if (!sb) notFound();
  const { data } = await sb.from("courts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <CourtForm court={data as CourtRow} />;
}
