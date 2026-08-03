"use client";

import { useEffect, useState } from "react";
import { differenceInMilliseconds, parseISO } from "date-fns";

export function useCountdown(
  targetAt: string | null,
  referenceTime?: string,
  intervalMilliseconds = 1_000,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!targetAt) {
      return;
    }
    const clientStart = Date.now();
    const referenceStart = referenceTime ? parseISO(referenceTime).getTime() : clientStart;
    const target = parseISO(targetAt);
    const update = (): void => {
      const estimatedNow = referenceStart + (Date.now() - clientStart);
      setRemaining(Math.max(0, differenceInMilliseconds(target, estimatedNow)));
    };
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, intervalMilliseconds);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [intervalMilliseconds, referenceTime, targetAt]);

  if (!targetAt) {
    return null;
  }
  return (
    remaining ??
    (referenceTime
      ? Math.max(0, differenceInMilliseconds(parseISO(targetAt), parseISO(referenceTime)))
      : 0)
  );
}
