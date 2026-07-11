"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getEvents } from "../requests/get-events";
import type { EventFilter } from "../../model/events.types";

export function useEventsQuery(filters: { type: EventFilter; page: number }) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: () => getEvents(filters),
  });
}
