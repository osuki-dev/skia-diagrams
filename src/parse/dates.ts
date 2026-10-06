const day = 86400000;
const tokens = ["YYYY", "MM", "DD", "HH", "mm", "ss"];
/** Deterministic UTC subset, not the locale-dependent Date.parse grammar. */
export function parseDate(value: string, format: string): number {
  if (format === "X" || format === "x") {
    const parsed = Number(value);
    return /^-?\d+(?:\.\d+)?$/.test(value) &&
      Number.isFinite(parsed) &&
      Number.isFinite(new Date(parsed * (format === "X" ? 1000 : 1)).getTime())
      ? parsed * (format === "X" ? 1000 : 1)
      : NaN;
  }
  const fields: string[] = [];
  const pattern = format.replace(/YYYY|MM|DD|HH|mm|ss|./g, (token) => {
    if (tokens.includes(token)) {
      fields.push(token);
      return token === "YYYY" ? "(\\d{4})" : "(\\d{2})";
    }
    return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  if (!fields.includes("YYYY") || !fields.includes("MM") || !fields.includes("DD")) return NaN;
  const match = new RegExp(`^${pattern}$`).exec(value);
  if (!match) return NaN;
  const values = Object.fromEntries(fields.map((f, i) => [f, Number(match[i + 1])]));
  const date = new Date(0);
  date.setUTCFullYear(values.YYYY, values.MM - 1, values.DD);
  date.setUTCHours(values.HH ?? 0, values.mm ?? 0, values.ss ?? 0, 0);
  if (
    date.getUTCFullYear() !== values.YYYY ||
    date.getUTCMonth() + 1 !== values.MM ||
    date.getUTCDate() !== values.DD ||
    date.getUTCHours() !== (values.HH ?? 0) ||
    date.getUTCMinutes() !== (values.mm ?? 0) ||
    date.getUTCSeconds() !== (values.ss ?? 0)
  )
    return NaN;
  return date.getTime();
}
export function formatAxisDate(time: number, format: string): string {
  const d = new Date(time),
    pad = (v: number) => String(v).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const values: Record<string, string> = {
    "%Y": String(d.getUTCFullYear()),
    "%y": String(d.getUTCFullYear()).slice(-2),
    "%s": String(Math.floor(time / 1000)),
    "%Q": String(time),
    "%L": String(d.getUTCMilliseconds()).padStart(3, "0"),
    "%m": pad(d.getUTCMonth() + 1),
    "%d": pad(d.getUTCDate()),
    "%H": pad(d.getUTCHours()),
    "%M": pad(d.getUTCMinutes()),
    "%S": pad(d.getUTCSeconds()),
    "%b": months[d.getUTCMonth()],
    "%a": days[d.getUTCDay()],
    "%%": "%",
  };
  return format.replace(/%./g, (token) => values[token] ?? token);
}
export function dateTicks(start: number, end: number): number[] {
  const span = end - start;
  const ticks: number[] = [];
  if (span > 2 * 365.25 * day) {
    // Calendar-year boundaries remain legible over decades; an arbitrary
    // month stride produces misleading 07/10/14 labels for authored %y axes.
    const step =
      [1, 2, 5, 10, 20, 50, 100].find((step) => step >= span / (365.25 * day * 10)) ?? 100;
    const firstYear = Math.ceil(new Date(start).getUTCFullYear() / step) * step;
    for (let year = firstYear, count = 0; count < 12; year += step, count++) {
      const date = new Date(0);
      date.setUTCFullYear(year, 0, 1);
      date.setUTCHours(0, 0, 0, 0);
      if (!Number.isFinite(date.getTime()) || date.getTime() > end) break;
      if (date.getTime() >= start) ticks.push(date.getTime());
    }
    return ticks.length ? ticks : [start];
  }
  const subdaySteps = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000,
    300000, 600000, 900000, 1800000, 3600000, 7200000, 10800000, 21600000, 43200000,
  ];
  const step =
    span < day
      ? (subdaySteps.find((step) => step >= span / 8) ?? 43200000)
      : span <= 10 * day
        ? day
        : span <= 70 * day
          ? 7 * day
          : 0;
  let next = step
    ? Math.ceil(start / step) * step
    : Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth() + 1, 1);
  const monthStep = Math.max(1, Math.ceil(span / (day * 30 * 10)));
  for (let count = 0; next <= end && count < 12; count++) {
    ticks.push(next);
    next = step
      ? next + step
      : Date.UTC(new Date(next).getUTCFullYear(), new Date(next).getUTCMonth() + monthStep, 1);
  }
  return ticks.length ? ticks : [start];
}
