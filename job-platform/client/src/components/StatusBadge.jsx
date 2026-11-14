import { STATUS_META, statusLabel } from "../utils/applicationStatus";

export default function StatusBadge({ status, className = "" }) {
    const style = STATUS_META[status]?.badge ?? "bg-gray-100 text-gray-700";
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style} ${className}`}>
            {statusLabel(status)}
        </span>
    );
}
