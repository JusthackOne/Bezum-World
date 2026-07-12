import { resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";

export interface CompactTaskCardData {
  title: string;
  image?: string | null;
}

const fallbackTaskImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Crect width='1200' height='800' fill='%23181e2b'/%3E%3Cpath d='M0 540 L260 360 L500 520 L760 300 L1200 560 L1200 800 L0 800 Z' fill='%23273245'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23d8dee9' font-size='58' font-family='Segoe UI, Arial, sans-serif'%3ETask%3C/text%3E%3C/svg%3E";

export function getTaskImageUrl(image?: string | null): string {
  return image ? resolveAssetUrl(image) : fallbackTaskImage;
}

export function CompactTaskCard({
  task,
  className,
}: {
  task: CompactTaskCardData;
  className?: string;
}) {
  return (
    <article className={cn("overflow-hidden rounded-lg border bg-card shadow-sm", className)}>
      <div className="h-28 w-full overflow-hidden bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getTaskImageUrl(task.image)}
          alt={task.title}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <h2 className="line-clamp-2 text-sm font-semibold">{task.title}</h2>
      </div>
    </article>
  );
}
