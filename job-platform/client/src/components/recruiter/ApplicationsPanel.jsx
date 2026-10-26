import { useEffect, useState } from "react";
import api from "../../api/axios";

const STATUSES = ["submitted", "reviewing", "shortlisted", "rejected", "hired"];

export default function ApplicationsPanel({ job, onClose, onChanged }) {
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");

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

        <ul className="space-y-3">
          {applications?.map((a) => (
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
