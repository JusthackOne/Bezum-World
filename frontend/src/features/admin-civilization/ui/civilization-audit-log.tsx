"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, FileClockIcon } from "lucide-react";

import type { CivilizationAdminAuditEntry } from "@/entities/civilization";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui/8bit";
import { formatDateTime } from "@/shared/lib/date-time";

import { useAdminCivilizationAuditQuery } from "../api";

function AuditEntryPayload({ entry }: { entry: CivilizationAdminAuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details className="mt-2" onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer text-muted-foreground">Inspect payload</summary>
      {expanded ? (
        <pre className="mt-2 max-h-36 overflow-auto border bg-background p-2 font-mono text-[9px] whitespace-pre-wrap">
          {JSON.stringify(
            { before: entry.beforeData, after: entry.afterData, metadata: entry.metadata },
            null,
            2,
          )}
        </pre>
      ) : null}
    </details>
  );
}

export function CivilizationAuditLog({ gameId }: { gameId: string }) {
  const [page, setPage] = useState(1);
  const query = useAdminCivilizationAuditQuery(gameId, page);
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.limit ?? 20)));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileClockIcon className="size-4" /> Administrative audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <p className="text-xs text-destructive">{query.error.message}</p>
        ) : query.data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No administrative changes have been recorded.
          </p>
        ) : (
          <ol className="space-y-2">
            {query.data.items.map((entry) => (
              <li key={entry.id} className="border bg-muted/15 p-3 text-[10px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-primary">{entry.action}</span>
                  <time className="text-muted-foreground">
                    {formatDateTime(entry.createdAt, "mediumWithSeconds")}
                  </time>
                </div>
                <p className="mt-2 text-muted-foreground">Admin ID: {entry.adminId}</p>
                <AuditEntryPayload entry={entry} />
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <span className="mr-2 text-[9px] text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={page <= 1}
            aria-label="Previous audit page"
            onClick={() => setPage((current) => current - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={page >= pages}
            aria-label="Next audit page"
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
