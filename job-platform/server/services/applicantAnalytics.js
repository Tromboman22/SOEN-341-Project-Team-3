import { APPLICATION_STATUSES } from "../models/Application.js";

/**
 * Job seeker analytics, computed from one applicant's applications.
 *
 * Kept free of Express and Mongoose so it can be unit tested with plain
 * objects: computeApplicantAnalytics([{ status, createdAt }, ...], options)
 */

// How many buckets the "applications over time" chart shows per interval
export const INTERVALS = Object.freeze({ week: 12, month: 12 });

// Status groups (see APPLICATION_STATUSES in models/Application.js)
// - active:    still in progress, no final answer yet
// - responded: the recruiter has acted on it (anything past "submitted")
// - interview: reached the interview stage ("shortlisted" sends the
//              interview_invitation notification) or got the job
export const ACTIVE_STATUSES = ["submitted", "reviewing", "shortlisted"];
export const RESPONDED_STATUSES = ["reviewing", "shortlisted", "rejected", "hired"];
export const INTERVIEW_STATUSES = ["shortlisted", "hired"];

const DAY_MS = 24 * 60 * 60 * 1000;

export const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== "string" || !timeZone || timeZone.length > 64)
    return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

// Returns a function that gives the calendar date of a moment in `timeZone`.
// Doing this with Intl (not a fixed UTC offset) keeps daylight saving right:
// 11 pm on a Sunday in Montreal is Monday in UTC, but it belongs to Sunday.
const localDateIn = (timeZone) => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  return (date) => {
    const parts = {};
    for (const p of fmt.formatToParts(date)) parts[p.type] = Number(p.value);
    return { year: parts.year, month: parts.month, day: parts.day };
  };
};

// Days since 1970-01-01 for a calendar date (no time zone involved)
const dayNumber = ({ year, month, day }) => Date.UTC(year, month - 1, day) / DAY_MS;

// Monday of the week containing that day
const weekStart = (dayNum) => {
  const weekday = new Date(dayNum * DAY_MS).getUTCDay(); // 0 = Sunday
  return dayNum - ((weekday + 6) % 7);
};

const isoDate = (dayNum) => new Date(dayNum * DAY_MS).toISOString().slice(0, 10);

// Bucket keys: weeks are the day number of their Monday, months are year*12+month
const bucketKey = (interval, local) =>
  interval === "month"
    ? local.year * 12 + (local.month - 1)
    : weekStart(dayNumber(local));

const keyToIsoDate = (interval, key) =>
  interval === "month"
    ? isoDate(dayNumber({ year: Math.floor(key / 12), month: (key % 12) + 1, day: 1 }))
    : isoDate(key);

const ratio = (part, total) => (total ? part / total : null);

/**
 * @param {Array<{status: string, createdAt: Date|string}>} applications
 * @param {{ interval?: "week"|"month", timeZone?: string, now?: Date }} options
 */
export function computeApplicantAnalytics(
  applications,
  { interval = "week", timeZone = "UTC", now = new Date() } = {}
) {
  const list = Array.isArray(applications) ? applications : [];
  const nowMs = now.getTime();
  const localDate = localDateIn(timeZone);

  // ---- status breakdown ----
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  for (const a of list) if (a.status in byStatus) byStatus[a.status] += 1;
  const sum = (statuses) => statuses.reduce((n, s) => n + byStatus[s], 0);

  const total = list.length;
  const responded = sum(RESPONDED_STATUSES);
  const interviews = sum(INTERVIEW_STATUSES);

  // ---- activity over time ----
  const count = INTERVALS[interval];
  const currentKey = bucketKey(interval, localDate(now));
  const step = interval === "month" ? 1 : 7;
  const firstKey = currentKey - (count - 1) * step;
  const counts = new Map();

  let last7Days = 0;
  let last30Days = 0;
  let first = null;
  let last = null;

  for (const a of list) {
    const t = new Date(a.createdAt);
    const ms = t.getTime();
    if (!Number.isFinite(ms)) continue; // no usable date: counted in total only

    const age = nowMs - ms;
    if (age >= 0 && age < 7 * DAY_MS) last7Days += 1;
    if (age >= 0 && age < 30 * DAY_MS) last30Days += 1;
    if (first === null || ms < first) first = ms;
    if (last === null || ms > last) last = ms;

    const key = bucketKey(interval, localDate(t));
    if (key >= firstKey && key <= currentKey)
      counts.set(key, (counts.get(key) || 0) + 1);
  }

  const buckets = [];
  for (let key = firstKey; key <= currentKey; key += step)
    buckets.push({ start: keyToIsoDate(interval, key), count: counts.get(key) || 0 });

  return {
    total,
    byStatus,
    active: sum(ACTIVE_STATUSES),
    responded,
    interviews,
    offers: byStatus.hired,
    rejected: byStatus.rejected,
    responseRate: ratio(responded, total),
    interviewRate: ratio(interviews, total),
    last7Days,
    last30Days,
    firstAppliedAt: first === null ? null : new Date(first).toISOString(),
    lastAppliedAt: last === null ? null : new Date(last).toISOString(),
    overTime: { interval, timeZone, buckets },
  };
}
