export interface SettleActionPointsInput {
  currentUnits: number;
  maximumUnits: number;
  regenerationUnits: number;
  regenerationIntervalMinutes: number;
  lastActionPointUpdateAt: Date;
  now: Date;
}

export interface ActionPointSettlementResult {
  actionPointUnits: number;
  regeneratedUnits: number;
  elapsedIntervals: number;
  lastActionPointUpdateAt: Date;
  nextRegenerationAt: Date | null;
}

const MILLISECONDS_PER_MINUTE = 60_000;

export function settleActionPoints(input: SettleActionPointsInput): ActionPointSettlementResult {
  assertNonNegativeInteger(input.currentUnits, 'currentUnits');
  assertPositiveInteger(input.maximumUnits, 'maximumUnits');
  assertPositiveInteger(input.regenerationUnits, 'regenerationUnits');
  assertPositiveInteger(input.regenerationIntervalMinutes, 'regenerationIntervalMinutes');

  const lastUpdatedMilliseconds = getValidTimestamp(
    input.lastActionPointUpdateAt,
    'lastActionPointUpdateAt',
  );
  const nowMilliseconds = getValidTimestamp(input.now, 'now');
  if (nowMilliseconds < lastUpdatedMilliseconds) {
    throw new RangeError('now cannot be before lastActionPointUpdateAt');
  }

  if (input.currentUnits >= input.maximumUnits) {
    return {
      actionPointUnits: input.maximumUnits,
      regeneratedUnits: 0,
      elapsedIntervals: 0,
      lastActionPointUpdateAt: new Date(nowMilliseconds),
      nextRegenerationAt: null,
    };
  }

  const intervalMilliseconds = input.regenerationIntervalMinutes * MILLISECONDS_PER_MINUTE;
  const elapsedIntervals = Math.floor(
    (nowMilliseconds - lastUpdatedMilliseconds) / intervalMilliseconds,
  );
  const availableCapacity = input.maximumUnits - input.currentUnits;
  const regeneratedUnits = Math.min(availableCapacity, elapsedIntervals * input.regenerationUnits);
  const actionPointUnits = input.currentUnits + regeneratedUnits;

  let settledUpdateMilliseconds = lastUpdatedMilliseconds;
  if (actionPointUnits >= input.maximumUnits) {
    settledUpdateMilliseconds = nowMilliseconds;
  } else if (elapsedIntervals > 0) {
    settledUpdateMilliseconds += elapsedIntervals * intervalMilliseconds;
  }

  return {
    actionPointUnits,
    regeneratedUnits,
    elapsedIntervals,
    lastActionPointUpdateAt: new Date(settledUpdateMilliseconds),
    nextRegenerationAt:
      actionPointUnits >= input.maximumUnits
        ? null
        : new Date(settledUpdateMilliseconds + intervalMilliseconds),
  };
}

function getValidTimestamp(value: Date, name: string): number {
  const milliseconds = value.getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return milliseconds;
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}
