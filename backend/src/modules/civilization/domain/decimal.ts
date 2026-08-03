export interface DecimalStringable {
  toString(): string;
}

export type DecimalLike = string | bigint | DecimalStringable;

export interface ExactDecimal {
  coefficient: bigint;
  scale: number;
}

const decimalPattern = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

export function parseDecimal(value: DecimalLike): ExactDecimal {
  const text = typeof value === 'string' ? value : value.toString();
  const match = decimalPattern.exec(text.trim());
  if (match === null) {
    throw new TypeError(`Invalid decimal value: ${text}`);
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const whole = match[2];
  const fraction = match[3] ?? '';
  const exponent = Number(match[4] ?? '0');
  if (whole === undefined || !Number.isSafeInteger(exponent)) {
    throw new TypeError(`Invalid decimal value: ${text}`);
  }

  let coefficient = BigInt(`${whole}${fraction}`) * sign;
  let scale = fraction.length - exponent;
  if (scale < 0) {
    coefficient *= powerOfTen(-scale);
    scale = 0;
  }

  return normalizeDecimal({ coefficient, scale });
}

export function addDecimals(...values: readonly DecimalLike[]): ExactDecimal {
  return values.reduce<ExactDecimal>(
    (total, value) => addExactDecimals(total, parseDecimal(value)),
    { coefficient: 0n, scale: 0 },
  );
}

export function addExactDecimals(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale);
  const leftCoefficient = left.coefficient * powerOfTen(scale - left.scale);
  const rightCoefficient = right.coefficient * powerOfTen(scale - right.scale);

  return normalizeDecimal({
    coefficient: leftCoefficient + rightCoefficient,
    scale,
  });
}

export function multiplyDecimals(left: DecimalLike, right: DecimalLike): ExactDecimal {
  const parsedLeft = parseDecimal(left);
  const parsedRight = parseDecimal(right);

  return normalizeDecimal({
    coefficient: parsedLeft.coefficient * parsedRight.coefficient,
    scale: parsedLeft.scale + parsedRight.scale,
  });
}

export function formatDecimal(value: ExactDecimal): string {
  const normalized = normalizeDecimal(value);
  const negative = normalized.coefficient < 0n;
  const absoluteDigits = (negative ? -normalized.coefficient : normalized.coefficient).toString();

  if (normalized.scale === 0) {
    return `${negative ? '-' : ''}${absoluteDigits}`;
  }

  const paddedDigits = absoluteDigits.padStart(normalized.scale + 1, '0');
  const splitIndex = paddedDigits.length - normalized.scale;

  return `${negative ? '-' : ''}${paddedDigits.slice(0, splitIndex)}.${paddedDigits.slice(splitIndex)}`;
}

export function toScaledInteger(value: DecimalLike, scale: number): bigint {
  assertScale(scale);
  const parsed = parseDecimal(value);
  if (parsed.scale <= scale) {
    return parsed.coefficient * powerOfTen(scale - parsed.scale);
  }

  const divisor = powerOfTen(parsed.scale - scale);
  return divideAndRoundHalfAwayFromZero(parsed.coefficient, divisor);
}

export function formatScaledInteger(value: bigint, scale: number): string {
  assertScale(scale);
  return formatDecimal({ coefficient: value, scale });
}

export function powerOfTen(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 100) {
    throw new RangeError('Decimal exponent must be an integer between 0 and 100');
  }

  return 10n ** BigInt(exponent);
}

export function divideAndRoundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError('Decimal denominator must be positive');
  }

  const negative = numerator < 0n;
  const absoluteNumerator = negative ? -numerator : numerator;
  const quotient = absoluteNumerator / denominator;
  const remainder = absoluteNumerator % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;

  return negative ? -rounded : rounded;
}

function normalizeDecimal(value: ExactDecimal): ExactDecimal {
  assertScale(value.scale);
  let { coefficient, scale } = value;

  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }

  return { coefficient, scale };
}

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 0 || scale > 100) {
    throw new RangeError('Decimal scale must be an integer between 0 and 100');
  }
}
