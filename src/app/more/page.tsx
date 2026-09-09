import { getMemberStats } from "@/lib/data";
import { getDuprAuthStatus } from "@/lib/dupr";
import { MoreView } from "@/components/MoreView";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const [stats, duprAuth] = await Promise.all([getMemberStats(), getDuprAuthStatus()]);
  return <MoreView stats={stats} duprAuth={duprAuth} />;
}
