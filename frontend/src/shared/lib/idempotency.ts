import { createRandomUuid } from "./random-uuid";

export interface IdempotencyAttempt {
  fingerprint: string;
  key: string;
}

interface MutableValueRef<T> {
  current: T;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortObjectKeys(record[key]);
        return sorted;
      }, {});
  }
  return value;
}

export function stableRequestFingerprint(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value)) ?? "undefined";
}

export function getOrCreateIdempotencyKey(
  attemptRef: MutableValueRef<IdempotencyAttempt | null>,
  fingerprint: string,
  createKey: () => string = createRandomUuid,
): string {
  if (attemptRef.current?.fingerprint === fingerprint) {
    return attemptRef.current.key;
  }

  const attempt = { fingerprint, key: createKey() };
  attemptRef.current = attempt;
  return attempt.key;
}

export function clearSuccessfulIdempotencyAttempt(
  attemptRef: MutableValueRef<IdempotencyAttempt | null>,
  fingerprint: string,
): void {
  if (attemptRef.current?.fingerprint === fingerprint) {
    attemptRef.current = null;
  }
}
