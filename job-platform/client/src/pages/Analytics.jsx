import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/recruiter/StatCard";
import StatusBadge from "../components/StatusBadge";
import ActivityChart from "../components/analytics/ActivityChart";
import StatusBreakdown from "../components/analytics/StatusBreakdown";
import { STATUS_ORDER, statusLabel } from "../utils/applicationStatus";
import { shortPeriodName } from "../utils/chartFormat";

// Sent to the server so weeks and months follow the user's calendar
const TIME_ZONE = (() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
})();

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDate = (d) => dateFmt.format(new Date(d));
const percent = (r) => (r == null ? "–" : `${Math.round(r * 100)}%`);

const card = "bg-white rounded-xl shadow-sm border border-gray-100 p-5";

export default function Analytics() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const historyRef = useRef(null);

    const [period, setPeriod] = useState("week");
    const [reloadKey, setReloadKey] = useState(0);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState("");

    const [applications, setApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(true);
    const [appsError, setAppsError] = useState("");
    const [filter, setFilter] = useState("all");

    const isApplicant = (user?.role || "applicant") === "applicant";

    // Loading flags are set by the handlers below; the effects only fetch.
    // `cancelled` drops a response that arrives after a newer request
    // (e.g. clicking Weekly then Monthly quickly).
    useEffect(() => {
        if (!isApplicant) return undefined;
        let cancelled = false;
        api.get("/applications/my/analytics", { params: { interval: period, tz: TIME_ZONE } })
            .then((res) => {
                if (cancelled) return;
                setStats(res.data);
                setStatsError("");
            })
            .catch((err) => {
                if (!cancelled) setStatsError(err.response?.data?.message || "Could not load analytics");
            })
            .finally(() => {
                if (!cancelled) setStatsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isApplicant, period, reloadKey]);

    useEffect(() => {
        if (!isApplicant) return undefined;
        let cancelled = false;
        api.get("/applications/my")
            .then((res) => {
                if (cancelled) return;
                setApplications(res.data.applications);
                setAppsError("");
            })
            .catch((err) => {
                if (!cancelled) setAppsError(err.response?.data?.message || "Could not load applications");
            })
            .finally(() => {
                if (!cancelled) setAppsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isApplicant, reloadKey]);

    const changePeriod = (value) => {
        if (value === period) return;
        setStatsLoading(true);
        setPeriod(value);
    };

    const refresh = () => {
        setStatsLoading(true);
        setAppsLoading(true);
        setReloadKey((k) => k + 1);
    };

    const counts = useMemo(() => {
        const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
        for (const a of applications) if (a.status in c) c[a.status] += 1;
        return c;
    }, [applications]);

    const visible = filter === "all" ? applications : applications.filter((a) => a.status === filter);

    const selectStatus = (status) => {
        setFilter(status);
        historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // Analytics are for job seekers; recruiters have their own dashboard stats
    if (!isApplicant) return <Navigate to="/dashboard" replace />;

    const buckets = stats?.overTime?.buckets ?? [];
    const inWindow = buckets.reduce((n, b) => n + b.count, 0);
    const busiest = buckets.reduce((best, b) => (b.count > (best?.count ?? 0) ? b : best), null);
    const hasData = stats && stats.total > 0;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">My analytics</h1>
                        <p className="text-sm text-gray-500">Where your applications stand and how active you've been.</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <button onClick={refresh} className="text-blue-600 hover:underline">
                            Refresh
                        </button>
                        <button onClick={() => navigate("/dashboard")} className="text-gray-600 hover:underline">
                            Back to dashboard
                        </button>
                    </div>
                </header>

                {statsError && (
                    <div className="bg-red-100 text-red-700 p-3 rounded text-sm flex justify-between gap-3">
                        <span>{statsError}</span>
                        <button onClick={refresh} className="underline">
                            Try again
                        </button>
                    </div>
                )}

                {!stats && statsLoading && <p className="text-sm text-gray-500">Loading analytics...</p>}

                {stats && !hasData && (
                    <section className={`${card} text-center py-10`}>
                        <h2 className="font-semibold">No applications yet</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Apply to a job from your dashboard and your stats will show up here.
                        </p>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                        >
                            Browse jobs
                        </button>
                    </section>
                )}

                {hasData && (
                    <>
                        {/* Headline numbers */}
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Applications"
                                value={stats.total}
                                hint={`${stats.last7Days} in the last 7 days`}
                            />
                            <StatCard label="In progress" value={stats.active} hint="Pending, in review or interview" />
                            <StatCard
                                label="Response rate"
                                value={percent(stats.responseRate)}
                                hint={`${stats.responded} of ${stats.total} heard back`}
                            />
                            <StatCard
                                label="Interviews"
                                value={stats.interviews}
                                hint={`${percent(stats.interviewRate)} of applications · ${stats.offers} hired`}
                            />
                        </section>

                        <div className="grid gap-6 md:grid-cols-5">
                            {/* Status breakdown */}
                            <section className={`${card} md:col-span-2`}>
                                <h2 className="font-semibold">Status breakdown</h2>
                                <p className="text-xs text-gray-500 mb-3">Click a status to see those applications.</p>
                                <StatusBreakdown
                                    byStatus={stats.byStatus}
                                    total={stats.total}
                                    selected={filter}
                                    onSelect={selectStatus}
                                />
                            </section>

                            {/* Activity over time */}
                            <section
                                className={`${card} md:col-span-3 transition-opacity ${statsLoading ? "opacity-60" : ""}`}
                                aria-busy={statsLoading}
                            >
                                <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                    <h2 className="font-semibold">Applications over time</h2>
                                    <div className="flex rounded-md border border-gray-300 overflow-hidden text-xs" role="group" aria-label="Group by">
                                        {[
                                            ["week", "Weekly"],
                                            ["month", "Monthly"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                onClick={() => changePeriod(value)}
                                                aria-pressed={period === value}
                                                className={`px-3 py-1 ${
                                                    period === value ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">
                                    {inWindow} in the last 12 {stats.overTime.interval === "month" ? "months" : "weeks"}
                                    {busiest &&
                                        ` · busiest: ${shortPeriodName(stats.overTime.interval, busiest.start)} (${busiest.count})`}
                                </p>
                                <ActivityChart buckets={buckets} interval={stats.overTime.interval} />
                            </section>
                        </div>
                    </>
                )}

                {/* Application history */}
                {(hasData || applications.length > 0) && (
                    <section ref={historyRef} className={`${card} scroll-mt-4`}>
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                            <h2 className="font-semibold">Application history</h2>
                            {filter !== "all" && (
                                <button onClick={() => setFilter("all")} className="text-xs text-blue-600 hover:underline">
                                    Show all
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by status">
                            {["all", ...STATUS_ORDER].map((s) => {
                                const n = s === "all" ? applications.length : counts[s];
                                const on = filter === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setFilter(s)}
                                        aria-pressed={on}
                                        className={`px-3 py-1 rounded-full text-xs border ${
                                            on
                                                ? "bg-gray-900 text-white border-gray-900"
                                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        {s === "all" ? "All" : statusLabel(s)} <span className="tabular-nums opacity-70">{n}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {appsError && <p className="text-sm text-red-600 mb-3">{appsError}</p>}

                        {appsLoading && applications.length === 0 ? (
                            <p className="text-sm text-gray-500">Loading applications...</p>
                        ) : visible.length === 0 ? (
                            <p className="text-sm text-gray-500">No applications with this status.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {visible.map((a) => {
                                    const statusChanged =
                                        a.status !== "submitted" &&
                                        a.updatedAt &&
                                        new Date(a.updatedAt) - new Date(a.createdAt) > 60 * 1000;
                                    return (
                                        <li key={a._id} className="py-3 flex justify-between items-start gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">
                                                    {a.job?.title || "Job no longer available"}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {[
                                                        a.job?.company,
                                                        a.job?.location,
                                                        a.job?.remote && !/^remote$/i.test(a.job?.location || "") && "Remote",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Applied {formatDate(a.createdAt)}
                                                    {statusChanged && ` · Status updated ${formatDate(a.updatedAt)}`}
                                                    {a.job?.status === "closed" && " · Posting closed"}
                                                </p>
                                            </div>
                                            <StatusBadge status={a.status} className="shrink-0" />
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
