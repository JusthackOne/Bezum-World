import { TZDate } from '@date-fns/tz';
import { addDays, addWeeks, startOfDay, startOfISOWeek } from 'date-fns';

export const MOSCOW_TIME_ZONE = 'Europe/Moscow';

export interface UtcInstantRange {
  start: Date;
  end: Date;
}

export function getMoscowDayRange(value: Date): UtcInstantRange {
  const startInMoscow = startOfDay(new TZDate(value, MOSCOW_TIME_ZONE));
  const endInMoscow = addDays(startInMoscow, 1);

  return {
    start: new Date(startInMoscow.getTime()),
    end: new Date(endInMoscow.getTime()),
  };
}

export function getMoscowIsoWeekRange(value: Date): UtcInstantRange {
  const startInMoscow = startOfISOWeek(new TZDate(value, MOSCOW_TIME_ZONE));
  const endInMoscow = addWeeks(startInMoscow, 1);

  return {
    start: new Date(startInMoscow.getTime()),
    end: new Date(endInMoscow.getTime()),
  };
}

export function getMoscowDateKey(value: Date): Date {
  const moscowDate = new TZDate(value, MOSCOW_TIME_ZONE);

  return new Date(
    Date.UTC(moscowDate.getFullYear(), moscowDate.getMonth(), moscowDate.getDate(), 0, 0, 0, 0),
  );
}
