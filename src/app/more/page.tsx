import { getMemberStats } from "@/lib/data";
import { duprConfigured } from "@/lib/dupr";
import { MoreView } from "@/components/MoreView";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const stats = await getMemberStats();
  return <MoreView stats={stats} duprEnabled={duprConfigured()} />;
}
