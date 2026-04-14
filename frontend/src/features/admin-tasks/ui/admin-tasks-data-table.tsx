"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAdminTasksQuery } from "@/features/admin-tasks/api";
import type { AdminTaskTypeFilter } from "@/features/admin-tasks/model/admin-task.types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const taskTypeFilterOptions: Array<{ label: string; value: AdminTaskTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Event", value: "event" },
];

const taskPageSizeOptions = [10, 20, 50];

function formatDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

export function AdminTasksDataTable() {
  const router = useRouter();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminTaskTypeFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const tasksQuery = useAdminTasksQuery(true, true, {
    search,
    type: typeFilter,
    page,
    limit,
  });
  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const totalPages = tasksQuery.data?.totalPages ?? 0;

  if (tasksQuery.isError) {
    return (
      <Card className="max-w-6xl">
        <CardHeader>
          <CardTitle>Failed to Load Tasks</CardTitle>
          <CardDescription>
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => tasksQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground text-sm">Manage quests, rewards, and limits.</p>
        </div>

        <Button type="button" variant="outline" onClick={() => router.push("/admin/tasks/create")}>
          <PlusIcon className="size-4" />
          Create Task
        </Button>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(draftSearch.trim());
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search by title"
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraftSearch("");
            setSearch("");
            setPage(1);
          }}
        >
          Reset
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {taskTypeFilterOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={typeFilter === option.value ? "default" : "outline"}
            onClick={() => {
              setTypeFilter(option.value);
              setPage(1);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks Table</CardTitle>
          <CardDescription>
            {tasksQuery.isPending
              ? "Loading tasks..."
              : `${tasksQuery.data?.total ?? 0} task${(tasksQuery.data?.total ?? 0) === 1 ? "" : "s"} total`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reward Money</TableHead>
                <TableHead>Reward Game Score</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasksQuery.isPending ? (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={5}>
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={5}>
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/tasks/${task.id}`)}
                  >
                    <TableCell>{task.title}</TableCell>
                    <TableCell className="uppercase">{task.type}</TableCell>
                    <TableCell>{task.rewardMoney}</TableCell>
                    <TableCell>{task.rewardGameScore ?? "N/A"}</TableCell>
                    <TableCell>{formatDate(task.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rows per page:</span>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                {taskPageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {tasksQuery.data?.page ?? page} of {totalPages === 0 ? 1 : totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || tasksQuery.isPending}
                onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={tasksQuery.isPending || totalPages === 0 || page >= totalPages}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
