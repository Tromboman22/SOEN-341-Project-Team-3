// Formatting helpers for the analytics charts.
//
// Bucket dates arrive as "YYYY-MM-DD" in the user's own calendar (the server
// already applied their time zone), so they are formatted in UTC to avoid
// shifting them by a day.

const fmt = (opts) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts });

export const TICK = { week: fmt({ month: "short", day: "numeric" }), month: fmt({ month: "short" }) };
export const LONG = {
    week: fmt({ month: "long", day: "numeric", year: "numeric" }),
    month: fmt({ month: "long", year: "numeric" }),
};

export const toDate = (iso) => new Date(`${iso}T00:00:00Z`);

// For tooltips and screen readers: "Week of November 9, 2026" / "October 2026"
export const periodName = (interval, iso) =>
    interval === "month" ? LONG.month.format(toDate(iso)) : `Week of ${LONG.week.format(toDate(iso))}`;

// For inline text: "week of Nov 2" / "October 2026"
export const shortPeriodName = (interval, iso) =>
    interval === "month" ? LONG.month.format(toDate(iso)) : `week of ${TICK.week.format(toDate(iso))}`;

// Clean y-axis: 0 to a round top, at most 4 steps of 1, 2, 5, 10, 20, ...
export function niceScale(max) {
    const top = Math.max(max, 1);
    let step = 1;
    for (let mag = 1; mag < 1e9; mag *= 10) {
        const found = [1, 2, 5].map((x) => x * mag).find((s) => top / s <= 4);
        if (found) {
            step = found;
            break;
        }
    }
    const niceTop = Math.ceil(top / step) * step;
    const ticks = [];
    for (let v = 0; v <= niceTop; v += step) ticks.push(v);
    return { top: niceTop, ticks };
}
