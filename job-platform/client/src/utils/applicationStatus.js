// How each application status is shown to job seekers.
// The stored values come from APPLICATION_STATUSES in
// server/models/Application.js; recruiters still see the raw values.
//
// "shortlisted" is shown as "Interview" because shortlisting sends the
// applicant an interview_invitation notification.

export const STATUS_ORDER = ["submitted", "reviewing", "shortlisted", "hired", "rejected"];

export const STATUS_META = {
    submitted: { label: "Pending", badge: "bg-gray-100 text-gray-700" },
    reviewing: { label: "In review", badge: "bg-blue-100 text-blue-700" },
    shortlisted: { label: "Interview", badge: "bg-violet-100 text-violet-700" },
    hired: { label: "Hired", badge: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", badge: "bg-red-100 text-red-700" },
};

export const statusLabel = (status) => STATUS_META[status]?.label ?? status;
