import { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";

const STATUSES = ["submitted", "reviewing", "shortlisted", "rejected", "hired"];

export default function ApplicationsPanel({ job, onClose, onChanged }) {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resumeOnly, setResumeOnly] = useState(false);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    api
      .get(`/recruiter/jobs/${job._id}/applications`)
      .then((res) => setApplications(res.data.applications))
      .catch((err) => setError(err.response?.data?.message || "Failed to load applicants"));
  }, [job._id]);

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/recruiter/applications/${id}`, { status });
      setApplications((apps) => apps.map((a) => (a._id === id ? { ...a, status } : a)));
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update status");
    }
  };

  const viewResume = async (id) => {
    try {
      const res = await api.get(`/recruiter/applications/${id}/resume`, { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch {
      setError("This applicant has no resume on file");
    }
  };

  // Filtering happens in the browser: all of this job's applications are already loaded
  const visible = useMemo(() => {
    if (!applications) return [];
    const q = search.trim().toLowerCase();
    const list = applications.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (resumeOnly && !a.applicant?.resume?.originalName) return false;
      if (!q) return true;
      const p = a.applicant ?? {};
      const haystack = [p.name, p.email, p.headline, p.location, ...(p.skills ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return list.sort((a, b) => {
      if (sort === "name") return (a.applicant?.name ?? "").localeCompare(b.applicant?.name ?? "");
      const diff = new Date(a.createdAt) - new Date(b.createdAt);
      return sort === "oldest" ? diff : -diff;
    });
  }, [applications, search, statusFilter, resumeOnly, sort]);

  const filtersActive = search.trim() !== "" || statusFilter !== "all" || resumeOnly;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setResumeOnly(false);
  };
  const countFor = (s) => applications?.filter((a) => a.status === s).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Applicants</h2>
            <p className="text-sm text-gray-500">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl leading-none">×</button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
        {!applications && !error && <p className="text-sm text-gray-500">Loading...</p>}
        {applications?.length === 0 && <p className="text-sm text-gray-500">No applications yet.</p>}

          {applications?.length > 0 && (
          <div className="mb-4 space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, location or skill"
              className="w-full border border-gray-300 p-2 rounded text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Filter by status</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border border-gray-300 p-2 rounded text-sm">
                  <option value="all">All ({applications.length})</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s} ({countFor(s)})</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border border-gray-300 p-2 rounded text-sm">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={resumeOnly} onChange={(e) => setResumeOnly(e.target.checked)} />
                Has a resume
              </label>
              <span className="text-xs text-gray-500">
                Showing {visible.length} of {applications.length}
                {filtersActive && (
                  <button onClick={clearFilters} className="ml-2 text-blue-600 hover:underline">Clear filters</button>
                )}
              </span>
            </div>
          </div>
        )}
        {applications?.length > 0 && visible.length === 0 && (
          <p className="text-sm text-gray-500">No applicants match these filters.</p>
        )}

        <ul className="space-y-3">
          {visible.map((a) => (
            <li key={a._id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.applicant?.name ?? "Deleted user"}</p>
                  <p className="text-xs text-gray-500">{a.applicant?.email}</p>
                  {a.applicant?.headline && <p className="text-xs text-gray-600 mt-1">{a.applicant.headline}</p>}
                  {(a.applicant?.location || a.applicant?.phone) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[a.applicant.location, a.applicant.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ApplicantProfile applicant={a.applicant} />
              {a.coverLetter && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap border-l-2 border-gray-200 pl-2">
                  {a.coverLetter}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <select
                  value={a.status}
                  onChange={(e) => changeStatus(a._id, e.target.value)}
                  className="border border-gray-300 rounded p-1 text-sm"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {a.applicant?.resume?.originalName ? (
                  <button onClick={() => viewResume(a._id)} className="text-sm text-blue-600 hover:underline">
                    📄 View resume
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">No resume</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const LINK_LABELS = { linkedin: "LinkedIn", github: "GitHub", portfolio: "Portfolio" };
const isWebLink = (url) => /^https?:\/\//i.test(url || "");

// Skills, links and bio from the applicant's profile (all optional)
function ApplicantProfile({ applicant }) {
  if (!applicant) return null;
  const skills = applicant.skills ?? [];
  const links = Object.entries(applicant.links ?? {}).filter(([, url]) => isWebLink(url));
  if (!skills.length && !links.length && !applicant.bio) return null;

  return (
    <div className="mt-2 space-y-2">
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skills.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
              {s}
            </span>
          ))}
        </div>
      )}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {links.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {LINK_LABELS[key] ?? key}
            </a>
          ))}
        </div>
      )}
      {applicant.bio && (
        <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3" title={applicant.bio}>
          {applicant.bio}
        </p>
      )}
    </div>
  );
}
