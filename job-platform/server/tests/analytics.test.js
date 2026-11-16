import test from "node:test";
import assert from "node:assert/strict";
import Application from "../models/Application.js";
import router from "../routes/applicationRoutes.js";
import { protect } from "../middleware/auth.js";
import { getMyAnalytics } from "../controllers/applicationController.js";
import {
  computeApplicantAnalytics,
  isValidTimeZone,
} from "../services/applicantAnalytics.js";
import { mockRes } from "./helpers.js";

const id = "507f1f77bcf86cd799439011";
const originalFind = Application.find;
test.afterEach(() => { Application.find = originalFind; });

// Saturday Nov 14 2026, noon in Montreal (EST, UTC-5)
const NOW = new Date("2026-11-14T17:00:00Z");
const TZ = "America/Toronto";
const app = (status, createdAt) => ({ status, createdAt: new Date(createdAt) });
const bucket = (result, start) => result.overTime.buckets.find((b) => b.start === start);

// ---------- status breakdown and rates ----------

test("no applications gives zeros, null rates and 12 empty weeks", () => {
  const r = computeApplicantAnalytics([], { now: NOW, timeZone: TZ });
  assert.equal(r.total, 0);
  assert.deepEqual(r.byStatus, { submitted: 0, reviewing: 0, shortlisted: 0, rejected: 0, hired: 0 });
  assert.equal(r.responseRate, null);
  assert.equal(r.interviewRate, null);
  assert.equal(r.firstAppliedAt, null);
  assert.equal(r.lastAppliedAt, null);
  assert.equal(r.overTime.buckets.length, 12);
  assert.ok(r.overTime.buckets.every((b) => b.count === 0));
});

test("counts every status and derives active, responses, interviews and offers", () => {
  const list = [
    app("submitted", "2026-11-10T15:00:00Z"),
    app("submitted", "2026-11-11T15:00:00Z"),
    app("reviewing", "2026-11-02T15:00:00Z"),
    app("shortlisted", "2026-10-20T15:00:00Z"),
    app("rejected", "2026-10-05T15:00:00Z"),
    app("rejected", "2026-09-28T15:00:00Z"),
    app("hired", "2026-09-15T15:00:00Z"),
    app("hired", "2026-09-01T15:00:00Z"),
  ];
  const r = computeApplicantAnalytics(list, { now: NOW, timeZone: TZ });
  assert.equal(r.total, 8);
  assert.deepEqual(r.byStatus, { submitted: 2, reviewing: 1, shortlisted: 1, rejected: 2, hired: 2 });
  assert.equal(r.active, 4); // submitted + reviewing + shortlisted
  assert.equal(r.responded, 6); // everything past "submitted"
  assert.equal(r.interviews, 3); // shortlisted + hired
  assert.equal(r.offers, 2);
  assert.equal(r.rejected, 2);
  assert.equal(r.responseRate, 6 / 8);
  assert.equal(r.interviewRate, 3 / 8);
});

test("status counts always add up to the total", () => {
  const list = ["submitted", "reviewing", "shortlisted", "rejected", "hired", "submitted"]
    .map((s, i) => app(s, `2026-11-0${i + 1}T12:00:00Z`));
  const r = computeApplicantAnalytics(list, { now: NOW });
  assert.equal(Object.values(r.byStatus).reduce((a, b) => a + b, 0), r.total);
});

test("last 7 and 30 days are rolling windows", () => {
  const list = [
    app("submitted", "2026-11-14T16:00:00Z"), // 1 hour ago
    app("submitted", "2026-11-07T17:00:01Z"), // just under 7 days ago
    app("submitted", "2026-11-07T17:00:00Z"), // exactly 7 days ago: not in last 7
    app("submitted", "2026-10-15T17:00:01Z"), // just under 30 days ago
    app("submitted", "2026-10-15T17:00:00Z"), // exactly 30 days ago: not in last 30
  ];
  const r = computeApplicantAnalytics(list, { now: NOW });
  assert.equal(r.last7Days, 2);
  assert.equal(r.last30Days, 4);
});

test("first and last application dates are reported", () => {
  const list = [
    app("submitted", "2026-10-01T12:00:00Z"),
    app("submitted", "2025-01-15T12:00:00Z"),
    app("submitted", "2026-11-13T12:00:00Z"),
  ];
  const r = computeApplicantAnalytics(list, { now: NOW });
  assert.equal(r.firstAppliedAt, "2025-01-15T12:00:00.000Z");
  assert.equal(r.lastAppliedAt, "2026-11-13T12:00:00.000Z");
});

test("an application without a valid date still counts in the total", () => {
  const r = computeApplicantAnalytics([{ status: "submitted" }, app("reviewing", "nope")], { now: NOW });
  assert.equal(r.total, 2);
  assert.equal(r.byStatus.submitted, 1);
  assert.equal(r.last30Days, 0);
  assert.ok(r.overTime.buckets.every((b) => b.count === 0));
});

// ---------- applications per week ----------

test("weeks start on Monday and end with the current week", () => {
  const r = computeApplicantAnalytics([], { now: NOW, timeZone: TZ });
  const starts = r.overTime.buckets.map((b) => b.start);
  assert.equal(starts[0], "2026-08-24");
  assert.equal(starts.at(-1), "2026-11-09"); // Monday of the week containing Sat Nov 14
  for (const s of starts) assert.equal(new Date(`${s}T00:00:00Z`).getUTCDay(), 1);
});

test("applications are counted in the right week", () => {
  const list = [
    app("submitted", "2026-11-09T15:00:00Z"), // Mon Nov 9
    app("submitted", "2026-11-14T15:00:00Z"), // Sat Nov 14
    app("submitted", "2026-11-06T15:00:00Z"), // Fri Nov 6
    app("submitted", "2026-08-24T15:00:00Z"), // first week shown
    app("submitted", "2026-08-21T15:00:00Z"), // before the window
  ];
  const r = computeApplicantAnalytics(list, { now: NOW, timeZone: TZ });
  assert.equal(bucket(r, "2026-11-09").count, 2);
  assert.equal(bucket(r, "2026-11-02").count, 1);
  assert.equal(bucket(r, "2026-08-24").count, 1);
  assert.equal(r.overTime.buckets.reduce((n, b) => n + b.count, 0), 4);
  assert.equal(r.total, 5); // older application still counts in the total
});

test("weeks follow the user's time zone, not UTC", () => {
  // Sunday Nov 8, 10:30 pm in Montreal = Monday Nov 9, 03:30 UTC
  const list = [app("submitted", "2026-11-09T03:30:00Z")];
  const montreal = computeApplicantAnalytics(list, { now: NOW, timeZone: TZ });
  const utc = computeApplicantAnalytics(list, { now: NOW, timeZone: "UTC" });
  assert.equal(bucket(montreal, "2026-11-02").count, 1);
  assert.equal(bucket(montreal, "2026-11-09").count, 0);
  assert.equal(bucket(utc, "2026-11-09").count, 1);
});

test("daylight saving time is handled (Oct 26 00:30 EDT is a Monday)", () => {
  // A fixed UTC-5 offset would put this on Sunday Oct 25
  const r = computeApplicantAnalytics([app("submitted", "2026-10-26T04:30:00Z")], { now: NOW, timeZone: TZ });
  assert.equal(bucket(r, "2026-10-26").count, 1);
  assert.equal(bucket(r, "2026-10-19").count, 0);
});

test("applications dated in the future are left out of the chart", () => {
  const r = computeApplicantAnalytics([app("submitted", "2026-12-01T12:00:00Z")], { now: NOW });
  assert.equal(r.total, 1);
  assert.equal(r.overTime.buckets.reduce((n, b) => n + b.count, 0), 0);
  assert.equal(r.last7Days, 0);
});

// ---------- applications per month ----------

test("month view shows the last 12 months, oldest first", () => {
  const r = computeApplicantAnalytics([], { now: NOW, timeZone: TZ, interval: "month" });
  const starts = r.overTime.buckets.map((b) => b.start);
  assert.equal(starts.length, 12);
  assert.equal(starts[0], "2025-12-01");
  assert.equal(starts.at(-1), "2026-11-01");
  assert.equal(r.overTime.interval, "month");
});

test("month view counts across the year boundary in the user's time zone", () => {
  // Dec 31 2025, 11:30 pm in Montreal = Jan 1 2026, 04:30 UTC
  const list = [
    app("submitted", "2026-01-01T04:30:00Z"),
    app("submitted", "2026-11-01T12:00:00Z"),
    app("submitted", "2026-11-14T12:00:00Z"),
    app("submitted", "2025-11-30T12:00:00Z"), // before the window
  ];
  const r = computeApplicantAnalytics(list, { now: NOW, timeZone: TZ, interval: "month" });
  assert.equal(bucket(r, "2025-12-01").count, 1);
  assert.equal(bucket(r, "2026-01-01").count, 0);
  assert.equal(bucket(r, "2026-11-01").count, 2);
  assert.equal(r.overTime.buckets.reduce((n, b) => n + b.count, 0), 3);
});

// ---------- time zone validation ----------

test("isValidTimeZone accepts IANA names and rejects anything else", () => {
  for (const tz of ["UTC", "America/Toronto", "Europe/Paris", "Asia/Kolkata"])
    assert.equal(isValidTimeZone(tz), true, tz);
  for (const tz of ["", "Mars/Olympus", "x".repeat(65), 5, null, ["UTC"]])
    assert.equal(isValidTimeZone(tz), false, String(tz));
});

// ---------- controller ----------

const mockFind = (rows, capture = {}) => (query) => {
  capture.query = query;
  return { select: (fields) => { capture.fields = fields; return { lean: async () => rows }; } };
};

test("analytics only reads the logged-in applicant's applications", async () => {
  const capture = {};
  Application.find = mockFind([app("reviewing", new Date())], capture);
  const res = mockRes();
  await getMyAnalytics({ user: { _id: id }, query: { tz: TZ } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(capture.query, { applicant: id });
  assert.equal(capture.fields, "status createdAt");
  assert.equal(res.body.total, 1);
  assert.equal(res.body.byStatus.reviewing, 1);
  assert.equal(res.body.overTime.timeZone, TZ);
});

test("defaults to weekly buckets in UTC", async () => {
  Application.find = mockFind([]);
  const res = mockRes();
  await getMyAnalytics({ user: { _id: id }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.overTime.interval, "week");
  assert.equal(res.body.overTime.timeZone, "UTC");
  assert.equal(res.body.overTime.buckets.length, 12);
});

test("monthly interval is accepted", async () => {
  Application.find = mockFind([]);
  const res = mockRes();
  await getMyAnalytics({ user: { _id: id }, query: { interval: "month" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.overTime.interval, "month");
});

test("invalid interval or time zone returns 400 without querying the database", async () => {
  let called = false;
  Application.find = () => { called = true; };
  const cases = [
    [{ interval: "day" }, /interval must be week or month/],
    [{ interval: ["week"] }, /interval must be week or month/],
    [{ interval: "__proto__" }, /interval must be week or month/],
    [{ tz: "Mars/Olympus" }, /Invalid time zone/],
    [{ tz: ["UTC", "UTC"] }, /Invalid time zone/],
    [{ tz: "" }, /Invalid time zone/],
  ];
  for (const [query, pattern] of cases) {
    const res = mockRes();
    await getMyAnalytics({ user: { _id: id }, query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
    assert.match(res.body.message, pattern);
  }
  assert.equal(called, false);
});

test("database errors return 500 with a generic message", async () => {
  Application.find = () => { throw new Error("connection lost"); };
  const res = mockRes();
  await getMyAnalytics({ user: { _id: id }, query: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Could not load analytics");
});

// ---------- route ----------

test("analytics route requires login and the applicant role", () => {
  const layer = router.stack.find((l) => l.route?.path === "/my/analytics");
  assert.ok(layer, "route /my/analytics is registered");
  assert.equal(layer.route.methods.get, true);
  const [auth, role, handler] = layer.route.stack.map((l) => l.handle);
  assert.equal(auth, protect);
  assert.equal(handler, getMyAnalytics);

  const res = mockRes();
  let nextCalled = false;
  role({ user: { role: "recruiter" } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
  role({ user: { role: "applicant" } }, mockRes(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
