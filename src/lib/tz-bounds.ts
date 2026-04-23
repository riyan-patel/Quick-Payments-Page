import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Context for report ask template runs (calendar math in the viewer's zone). */
export type ReportAskRunContext = {
  timeZone: string;
};

/**
 * Validate IANA zone; fall back to UTC if invalid.
 */
export function normalizeTimeZone(tz: string | undefined): string {
  const t = (tz ?? "UTC").trim() || "UTC";
  try {
    fromZonedTime(new Date(2020, 0, 1, 0, 0, 0, 0), t);
    return t;
  } catch {
    return "UTC";
  }
}

/** Today’s calendar Y/M/D in the given IANA zone. */
export function localYmdInZone(tz: string, instant: Date = new Date()): {
  y: number;
  m: number;
  d: number;
} {
  return {
    y: Number(formatInTimeZone(instant, tz, "yyyy")),
    m: Number(formatInTimeZone(instant, tz, "M")),
    d: Number(formatInTimeZone(instant, tz, "d")),
  };
}

export function localMonthBoundsMs(
  tz: string,
  y: number,
  m: number,
): { startMs: number; endExMs: number } {
  const start = fromZonedTime(new Date(y, m - 1, 1, 0, 0, 0, 0), tz);
  if (m === 12) {
    const end = fromZonedTime(new Date(y + 1, 0, 1, 0, 0, 0, 0), tz);
    return { startMs: start.getTime(), endExMs: end.getTime() };
  }
  const end = fromZonedTime(new Date(y, m, 1, 0, 0, 0, 0), tz);
  return { startMs: start.getTime(), endExMs: end.getTime() };
}

export function localYearBoundsMs(
  tz: string,
  y: number,
): { startMs: number; endExMs: number } {
  const start = fromZonedTime(new Date(y, 0, 1, 0, 0, 0, 0), tz);
  const end = fromZonedTime(new Date(y + 1, 0, 1, 0, 0, 0, 0), tz);
  return { startMs: start.getTime(), endExMs: end.getTime() };
}

export function localQuarterBoundsMs(
  tz: string,
  y: number,
  q: 1 | 2 | 3 | 4,
): { startMs: number; endExMs: number } {
  const m0 = (q - 1) * 3 + 1;
  const start = fromZonedTime(new Date(y, m0 - 1, 1, 0, 0, 0, 0), tz);
  const endMonth = m0 + 3;
  if (endMonth > 12) {
    const end = fromZonedTime(new Date(y + 1, 0, 1, 0, 0, 0, 0), tz);
    return { startMs: start.getTime(), endExMs: end.getTime() };
  }
  const end = fromZonedTime(new Date(y, endMonth - 1, 1, 0, 0, 0, 0), tz);
  return { startMs: start.getTime(), endExMs: end.getTime() };
}

/**
 * Local calendar day as [start, end) in UTC ms.
 * `end` `full` = through next local midnight. Otherwise exclusive clock time on that day.
 */
export function localCalendarDayWindowMs(
  tz: string,
  y: number,
  month: number,
  day: number,
  endMode: "full" | { hour: number; minute?: number },
): { startMs: number; endExMs: number } {
  const start = fromZonedTime(new Date(y, month - 1, day, 0, 0, 0, 0), tz);
  if (endMode === "full") {
    const next = fromZonedTime(new Date(y, month - 1, day + 1, 0, 0, 0, 0), tz);
    return { startMs: start.getTime(), endExMs: next.getTime() };
  }
  const he = endMode.hour;
  const mi = endMode.minute ?? 0;
  const endAt = fromZonedTime(new Date(y, month - 1, day, he, mi, 0, 0), tz);
  return { startMs: start.getTime(), endExMs: endAt.getTime() };
}

/**
 * Inclusive start, exclusive end, both interpreted on the same local calendar day.
 * Example: 1–3pm → start 13:00, end 15:00 (2:00 PM and 1:55 PM in; 3:00 PM out).
 * Converts wall times to UTC instants for filtering DB `created_at` (UTC).
 */
export function localTimeRangeOnLocalDayMs(
  tz: string,
  y: number,
  month: number,
  day: number,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
): { startMs: number; endExMs: number } {
  const start = fromZonedTime(
    new Date(y, month - 1, day, startHour, startMinute, 0, 0),
    tz,
  );
  const end = fromZonedTime(
    new Date(y, month - 1, day, endHour, endMinute, 0, 0),
    tz,
  );
  return { startMs: start.getTime(), endExMs: end.getTime() };
}

/**
 * Multi-day local window: from start date at 00:00:00 to either (a) 00:00:00
 * on the day after the end date ("full" end day included), or (b) a local clock
 * on the end date (exclusive, same semantics as [start, end) elsewhere).
 * Used for "between Jan 1 and Apr 23 at 2pm" → start Jan 1 local midnight, end
 * exclusive at Apr 23 14:00 in `tz` (converts to UTC for `created_at` compare).
 */
export function localDateTimeRangeWindowMs(
  tz: string,
  startYear: number,
  startMonth: number,
  startDay: number,
  endYear: number,
  endMonth: number,
  endDay: number,
  endMode:
    | "end_of_end_day"
    | { localHour: number; localMinute: number },
): { startMs: number; endExMs: number } | null {
  const startMs = fromZonedTime(
    new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0),
    tz,
  ).getTime();
  let endExMs: number;
  if (endMode === "end_of_end_day") {
    endExMs = fromZonedTime(
      new Date(endYear, endMonth - 1, endDay + 1, 0, 0, 0, 0),
      tz,
    ).getTime();
  } else {
    const { localHour, localMinute } = endMode;
    endExMs = fromZonedTime(
      new Date(
        endYear,
        endMonth - 1,
        endDay,
        localHour,
        localMinute,
        0,
        0,
      ),
      tz,
    ).getTime();
  }
  if (endExMs <= startMs) return null;
  return { startMs, endExMs };
}

/** Previous full calendar month in the given zone, relative to `instant`. */
export function localPreviousMonthBoundsMs(
  tz: string,
  instant: Date = new Date(),
): { startMs: number; endExMs: number } {
  const { y, m } = localYmdInZone(tz, instant);
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return localMonthBoundsMs(tz, py, pm);
}

/** Local calendar day string yyyy-MM-dd for grouping. */
export function localDateKey(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
}
