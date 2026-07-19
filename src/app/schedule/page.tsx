import { getEventsWithAttendance } from "@/lib/data";
import { ScheduleView } from "@/components/ScheduleView";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const events = await getEventsWithAttendance();
  return (
    <div className="pt-1">
      <h1 className="mb-4 hidden text-[22px] font-extrabold md:block">
        スケジュール
      </h1>
      <ScheduleView events={events} />
    </div>
  );
}
