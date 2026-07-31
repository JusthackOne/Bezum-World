import type { CivilizationGameStatus } from "@/entities/civilization";
import { cn } from "@/shared/lib/utils";

const statusStyles: Record<CivilizationGameStatus, string> = {
  DRAFT: "border-slate-400/50 bg-slate-500/15 text-slate-300",
  SCHEDULED: "border-blue-400/50 bg-blue-500/15 text-blue-300",
  ACTIVE: "border-emerald-400/50 bg-emerald-500/15 text-emerald-300",
  COMPLETED: "border-violet-400/50 bg-violet-500/15 text-violet-300",
  CANCELLED: "border-red-400/50 bg-red-500/15 text-red-300",
};

export function CivilizationStatusBadge({
  status,
  className,
}: {
  status: CivilizationGameStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 text-[10px] font-medium",
        statusStyles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
