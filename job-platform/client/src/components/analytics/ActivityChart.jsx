import { useState } from "react";
import { LONG, TICK, niceScale, periodName, toDate } from "../../utils/chartFormat";

const plural = (n) => `${n} application${n === 1 ? "" : "s"}`;

/**
 * Column chart of applications per week or month.
 * One series, so no legend: the card title says what is plotted.
 * Hover or keyboard focus on a column shows its value; "Show as table" lists
 * every value without hovering.
 */
export default function ActivityChart({ buckets, interval }) {
    const [active, setActive] = useState(null);
    const { top, ticks } = niceScale(Math.max(0, ...buckets.map((b) => b.count)));
    const pct = (v) => `${(v / top) * 100}%`;
    const n = buckets.length;

    return (
        <div>
            <div className="flex">
                {/* y-axis labels */}
                <div className="relative w-7 h-44 shrink-0 text-[11px] text-gray-500 tabular-nums" aria-hidden="true">
                    {ticks.map((t) => (
                        <span key={t} className="absolute right-2 translate-y-1/2" style={{ bottom: pct(t) }}>
                            {t}
                        </span>
                    ))}
                </div>

                <div
                    className="relative flex-1 h-44"
                    role="group"
                    aria-label={`Applications per ${interval}, last ${n} ${interval}s`}
                >
                    {/* gridlines (hairline, recessive) and baseline */}
                    {ticks.map((t) => (
                        <div
                            key={t}
                            aria-hidden="true"
                            className={`absolute left-0 right-0 border-t ${t === 0 ? "border-gray-300" : "border-gray-100"}`}
                            style={{ bottom: pct(t) }}
                        />
                    ))}

                    {/* columns: the whole slot is the hover/focus target, not just the bar */}
                    <div className="absolute inset-0 flex items-end">
                        {buckets.map((b, i) => {
                            const isActive = active === i;
                            const align =
                                i < 2 ? "left-0" : i > n - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                            return (
                                <div
                                    key={b.start}
                                    tabIndex={0}
                                    aria-label={`${periodName(interval, b.start)}: ${plural(b.count)}`}
                                    onMouseEnter={() => setActive(i)}
                                    onMouseLeave={() => setActive(null)}
                                    onFocus={() => setActive(i)}
                                    onBlur={() => setActive(null)}
                                    className="relative flex-1 h-full flex items-end justify-center px-0.5 outline-none focus-visible:bg-blue-50 rounded"
                                >
                                    {b.count > 0 && (
                                        <div
                                            className={`w-full max-w-6 rounded-t ${isActive ? "bg-blue-700" : "bg-blue-500"}`}
                                            style={{ height: pct(b.count) }}
                                        />
                                    )}
                                    {isActive && (
                                        <div
                                            role="tooltip"
                                            className={`absolute z-10 ${align} px-2.5 py-1.5 rounded-md bg-gray-900 text-white shadow-lg whitespace-nowrap pointer-events-none`}
                                            style={{ bottom: `calc(${pct(b.count)} + 8px)` }}
                                        >
                                            <span className="block text-sm font-semibold">{plural(b.count)}</span>
                                            <span className="block text-[11px] text-gray-300">{periodName(interval, b.start)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* x-axis labels: every other week (ending on the current one) so
                they never touch; min-w-0 lets a slot be narrower than its text */}
            <div className="flex ml-7 mt-1.5" aria-hidden="true">
                {buckets.map((b, i) => (
                    <span key={b.start} className="flex-1 min-w-0 flex justify-center">
                        {(interval === "month" || (n - 1 - i) % 2 === 0) && (
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                {TICK[interval].format(toDate(b.start))}
                            </span>
                        )}
                    </span>
                ))}
            </div>

            <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs text-blue-600 hover:underline w-fit">Show as table</summary>
                <table className="mt-2 w-full max-w-sm text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                            <th className="py-1 font-medium">{interval === "month" ? "Month" : "Week of"}</th>
                            <th className="py-1 font-medium text-right">Applications</th>
                        </tr>
                    </thead>
                    <tbody>
                        {buckets.map((b) => (
                            <tr key={b.start} className="border-b border-gray-100">
                                <td className="py-1">
                                    {interval === "month" ? LONG.month.format(toDate(b.start)) : LONG.week.format(toDate(b.start))}
                                </td>
                                <td className="py-1 text-right tabular-nums">{b.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}
