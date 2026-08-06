import { tz } from "@date-fns/tz";
import {
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  parse,
} from "date-fns";
import { ru } from "date-fns/locale";

export type DateTimeDisplayStyle = "short" | "shortWithSeconds" | "medium" | "mediumWithSeconds";

const DATE_TIME_PATTERNS: Record<DateTimeDisplayStyle, string> = {
  short: "P p",
  shortWithSeconds: "P pp",
  medium: "PP p",
  mediumWithSeconds: "PP pp",
};

function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDateTime(
  value: string | number | Date,
  style: DateTimeDisplayStyle = "medium",
  timeZone = localTimeZone(),
): string {
  return format(value, DATE_TIME_PATTERNS[style], {
    locale: ru,
    in: tz(timeZone),
  });
}

export function toLocalDateTimeInput(
  value: string | number | Date,
  timeZone = localTimeZone(),
): string {
  return format(value, "yyyy-MM-dd'T'HH:mm", { in: tz(timeZone) });
}

export function fromLocalDateTimeInput(value: string, timeZone = localTimeZone()): string {
  return parse(value, "yyyy-MM-dd'T'HH:mm", new Date(0), {
    in: tz(timeZone),
  }).toISOString();
}

export function formatDurationClock(milliseconds: number): string {
  const remaining = Math.max(0, milliseconds);
  const hours = differenceInHours(remaining, 0);
  const minutes = differenceInMinutes(remaining, 0) % 60;
  const seconds = differenceInSeconds(remaining, 0) % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatMinutesDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${hours} h ${remainingMinutes} min`;
}
