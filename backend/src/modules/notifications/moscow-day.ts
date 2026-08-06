import { TZDate } from '@date-fns/tz';
import { startOfDay, subDays } from 'date-fns';

import { DAILY_DIGEST_TIME_ZONE } from './notifications.constants';

export interface MoscowDayRange {
  date: string;
  start: Date;
  end: Date;
}

export function getPreviousMoscowDayRange(triggeredAt: Date): MoscowDayRange {
  const moscowTime = new TZDate(triggeredAt, DAILY_DIGEST_TIME_ZONE);
  const currentDayStart = startOfDay(moscowTime);
  const previousDayStart = subDays(currentDayStart, 1);
  const start = new Date(previousDayStart.getTime());
  const end = new Date(currentDayStart.getTime());
  const date = [
    previousDayStart.getFullYear(),
    String(previousDayStart.getMonth() + 1).padStart(2, '0'),
    String(previousDayStart.getDate()).padStart(2, '0'),
  ].join('-');

  return { date, start, end };
}
