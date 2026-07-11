const NEW_ITEM_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isCreatedWithinLastDay(createdAt?: string | null): boolean {
  if (!createdAt) {
    return false;
  }

  const createdTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return false;
  }

  const ageMs = Date.now() - createdTime;

  return ageMs >= 0 && ageMs < NEW_ITEM_WINDOW_MS;
}
