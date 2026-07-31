import {
  divideAndRoundHalfAwayFromZero,
  formatScaledInteger,
  parseDecimal,
  powerOfTen,
  toScaledInteger,
  type DecimalLike,
} from './decimal';

export const CIVILIZATION_RESOURCE_DECIMAL_SCALE = 12;
const MILLISECONDS_PER_HOUR = 3_600_000n;

export interface SettleDecimalResourceInput {
  amount: DecimalLike;
  incomePerHour: DecimalLike;
  lastSettledAt: Date;
  now: Date;
  outputScale?: number;
}

export interface DecimalResourceSettlementResult {
  previousAmount: string;
  incomePerHour: string;
  accruedAmount: string;
  amount: string;
  elapsedMilliseconds: number;
  lastSettledAt: Date;
}

export function settleDecimalResource(
  input: SettleDecimalResourceInput,
): DecimalResourceSettlementResult {
  const outputScale = input.outputScale ?? CIVILIZATION_RESOURCE_DECIMAL_SCALE;
  if (!Number.isInteger(outputScale) || outputScale < 0 || outputScale > 30) {
    throw new RangeError('outputScale must be an integer between 0 and 30');
  }

  const parsedAmount = parseDecimal(input.amount);
  const parsedIncome = parseDecimal(input.incomePerHour);
  if (parsedAmount.coefficient < 0n || parsedIncome.coefficient < 0n) {
    throw new RangeError('Resource amount and income rate cannot be negative');
  }

  const lastSettledMilliseconds = validTimestamp(input.lastSettledAt, 'lastSettledAt');
  const nowMilliseconds = validTimestamp(input.now, 'now');
  if (nowMilliseconds < lastSettledMilliseconds) {
    throw new RangeError('now cannot be before lastSettledAt');
  }

  const elapsedMilliseconds = nowMilliseconds - lastSettledMilliseconds;
  const previousScaledAmount = toScaledInteger(input.amount, outputScale);
  const accruedNumerator =
    parsedIncome.coefficient * BigInt(elapsedMilliseconds) * powerOfTen(outputScale);
  const accruedDenominator = powerOfTen(parsedIncome.scale) * MILLISECONDS_PER_HOUR;
  const accruedScaledAmount = divideAndRoundHalfAwayFromZero(accruedNumerator, accruedDenominator);

  return {
    previousAmount: formatScaledInteger(previousScaledAmount, outputScale),
    incomePerHour: formatScaledInteger(
      toScaledInteger(input.incomePerHour, outputScale),
      outputScale,
    ),
    accruedAmount: formatScaledInteger(accruedScaledAmount, outputScale),
    amount: formatScaledInteger(previousScaledAmount + accruedScaledAmount, outputScale),
    elapsedMilliseconds,
    lastSettledAt: new Date(nowMilliseconds),
  };
}

function validTimestamp(value: Date, name: string): number {
  const timestamp = value.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`${name} must be a valid date`);
  }

  return timestamp;
}
