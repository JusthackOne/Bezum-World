import { SparklesIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-cyan-200/80 bg-[linear-gradient(120deg,rgba(34,211,238,0.95),rgba(59,130,246,0.92),rgba(217,70,239,0.9))] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_0_0_1px_rgba(255,255,255,0.32),0_8px_22px_rgba(59,130,246,0.34)]",
        className,
      )}
    >
      <SparklesIcon className="size-3" />
      New
    </span>
  );
}
