import StatusBadge from "../StatusBadge";
import { STATUS_ORDER, statusLabel } from "../../utils/applicationStatus";

/**
 * One row per status in pipeline order: name, a bar for its share of all
 * applications, and the count and percentage. Bars use one color so the
 * label, not the hue, says which status it is.
 * Clicking a row filters the application history to that status.
 */
export default function StatusBreakdown({ byStatus, total, selected, onSelect }) {
    return (
        <ul className="space-y-1">
            {STATUS_ORDER.map((status) => {
                const count = byStatus?.[status] ?? 0;
                const exact = total ? (count / total) * 100 : 0;
                const share = count > 0 && exact < 1 ? "<1" : Math.round(exact);
                const isSelected = selected === status;
                return (
                    <li key={status}>
                        <button
                            type="button"
                            onClick={() => onSelect(isSelected ? "all" : status)}
                            aria-pressed={isSelected}
                            aria-label={`${statusLabel(status)}: ${count} of ${total} (${share}%). ${
                                isSelected ? "Show all applications" : "Show these applications"
                            }`}
                            className={`w-full grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 px-2 py-1.5 rounded-lg text-left hover:bg-gray-50 ${
                                isSelected ? "bg-blue-50 hover:bg-blue-50" : ""
                            }`}
                        >
                            <span>
                                <StatusBadge status={status} />
                            </span>
                            <span className="h-2 rounded-full bg-blue-50 overflow-hidden" aria-hidden="true">
                                {count > 0 && (
                                    <span className="block h-full rounded-full bg-blue-500" style={{ width: `${exact}%` }} />
                                )}
                            </span>
                            <span className="text-sm text-right tabular-nums">
                                <span className="font-semibold text-gray-900">{count}</span>
                                <span className="text-gray-500"> · {share}%</span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
