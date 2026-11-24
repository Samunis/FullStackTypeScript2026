const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * MS_PER_DAY);
}

export function daysToMs(days: number): number {
  return days * MS_PER_DAY;
}
