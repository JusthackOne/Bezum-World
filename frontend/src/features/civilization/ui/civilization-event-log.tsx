"use client";

import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon } from "lucide-react";

import { useCivilizationEventsQuery } from "../api";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui/8bit";
import { formatDateTime } from "@/shared/lib/date-time";

function eventLabel(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function describePayload(payload: Record<string, unknown>): string | null {
  const preferredKeys = ["message", "result", "reason", "amount", "coordinate"];
  for (const key of preferredKeys) {
    const value = payload[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (value && typeof value === "object") {
      return JSON.stringify(value);
    }
  }
  return null;
}

export function CivilizationEventLog({
  gameId,
  page,
  isActive = false,
  onPageChange,
}: {
  gameId: string;
  page: number;
  isActive?: boolean;
  onPageChange: (page: number) => void;
}) {
  const query = useCivilizationEventsQuery(gameId, page, 20, isActive);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.limit ?? 20)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HistoryIcon className="size-4" /> Event history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <p className="text-xs text-destructive">{query.error.message}</p>
        ) : query.data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events have been recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {query.data.items.map((event) => {
              const payloadSummary = describePayload(event.payload);
              return (
                <li key={event.id} className="border-l-2 border-primary/60 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-primary">{eventLabel(event.type)}</span>
                    <time className="text-[9px] text-muted-foreground">
                      {formatDateTime(event.createdAt, "shortWithSeconds")}
                    </time>
                  </div>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {event.actor?.username ?? "System"}
                    {event.target ? ` → ${event.target.username}` : ""}
                    {payloadSummary ? ` · ${payloadSummary}` : ""}
                  </p>
                  {Object.keys(event.payload).length > 0 ? (
                    <details className="mt-2 text-[8px] text-muted-foreground">
                      <summary className="cursor-pointer select-none">Structured details</summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all border bg-background/60 p-2">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-[9px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={page <= 1}
              aria-label="Previous event page"
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={page >= totalPages}
              aria-label="Next event page"
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
