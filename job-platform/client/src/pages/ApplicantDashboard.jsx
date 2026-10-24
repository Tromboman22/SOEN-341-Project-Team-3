import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function ApplicantDashboard() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // resume (optional)
  const [file, setFile] = useState(null);
  const [resumeMsg, setResumeMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  // jobs
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [applyingTo, setApplyingTo] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [jobMsg, setJobMsg] = useState("");
// Application Tracking
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const loadJobs = async (q = "") => {
    setJobsLoading(true);
    try {
      const res = await api.get("/jobs", { params: q ? { search: q } : {} });
      setJobs(res.data.jobs);
    } catch (err) {
      setJobMsg(err.response?.data?.message || "Could not load jobs");
    } finally {
      setJobsLoading(false);
    }
  };
  const loadApplications = async () => {
  setApplicationsLoading(true);
  setApplicationsError("");

  try {
    const res = await api.get("/applications/my");
    setApplications(res.data.applications);
  } catch (err) {
    setApplicationsError(
      err.response?.data?.message || "Could not load applications"
    );
  } finally {
    setApplicationsLoading(false);
  }
};

 useEffect(() => {
  loadJobs();
  loadApplications();
}, []);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResumeMsg("");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await api.post("/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, resume: res.data.resume });
      setResumeMsg("Resume uploaded ✅");
      setFile(null);
    } catch (err) {
      setResumeMsg(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onViewResume = async () => {
    try {
      const res = await api.get("/resume", { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch {
      setResumeMsg("Could not open resume");
    }
  };

  const onApply = async (jobId) => {
    setJobMsg("");
    try {
      await api.post(`/jobs/${jobId}/apply`, { coverLetter });
      await loadApplications();
      setJobMsg("Application sent ✅");
      setApplyingTo(null);
      setCoverLetter("");
    } catch (err) {
      setJobMsg(err.response?.data?.message || "Could not apply");
    }
  };

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Hi, {user?.name} 👋</h1>
          <button onClick={onLogout} className="text-sm text-red-600 hover:underline">
            Logout
          </button>
        </header>

        {/* Resume: optional */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-1">
            Your resume <span className="text-xs font-normal text-gray-400">(optional)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            You can browse and apply to jobs without one. Adding a PDF lets recruiters see it.
          </p>

          {user?.resume && (
            <div className="bg-green-50 border border-green-200 p-3 rounded mb-3 text-sm">
              📄 {user.resume.originalName} ({(user.resume.size / 1024).toFixed(1)} KB)
              <button onClick={onViewResume} className="ml-3 text-blue-600 hover:underline">
                View
              </button>
            </div>
          )}

          <form onSubmit={onUpload} className="flex flex-wrap gap-3 items-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm border p-2 rounded flex-1 min-w-0"
            />
            <button
              disabled={!file || uploading}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : user?.resume ? "Replace" : "Upload PDF"}
            </button>
          </form>
          {resumeMsg && <p className="mt-3 text-sm">{resumeMsg}</p>}
        </section>

        {/* Jobs */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex gap-2 p-4 border-b border-gray-100">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadJobs(search)}
              placeholder="Search title, company, location"
              className="flex-1 border p-2 rounded text-sm"
            />
            <button
              onClick={() => loadJobs(search)}
              className="bg-gray-900 text-white px-4 rounded text-sm"
            >
              Search
            </button>
          </div>

          {jobMsg && <p className="px-4 pt-3 text-sm">{jobMsg}</p>}

          {jobsLoading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : jobs.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No open jobs found.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <li key={job._id} className="p-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-xs text-gray-500">
                        {[job.company, job.location, job.remote && "Remote", job.type]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setApplyingTo(applyingTo === job._id ? null : job._id);
                        setCoverLetter("");
                        setJobMsg("");
                      }}
                      className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                    >
                      {applyingTo === job._id ? "Cancel" : "Apply"}
                    </button>
                  </div>

                  {applyingTo === job._id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Cover letter (optional)"
                        rows={3}
                        className="w-full border p-2 rounded text-sm"
                      />
                      <button
                        onClick={() => onApply(job._id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                      >
                        Send application
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        {/* Application Tracking */}
<section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold">My Applications</h2>

    <button
      onClick={loadApplications}
      className="text-sm text-blue-600 hover:underline"
    >
      Refresh
    </button>
  </div>

  {applicationsError && (
    <p className="text-red-600 text-sm mb-3">
      {applicationsError}
    </p>
  )}

  {applicationsLoading ? (
    <p className="text-gray-500">Loading applications...</p>
  ) : applications.length === 0 ? (
    <p className="text-gray-500">
      You have not submitted any applications yet.
    </p>
  ) : (
    <div className="space-y-4">
      {applications.map((application) => (
        <div
          key={application._id}
          className="border rounded-lg p-4"
        >
          <h3 className="font-semibold text-lg">
            {application.job?.title || "Job unavailable"}
          </h3>

          <p className="text-sm text-gray-500">
            {application.job?.company || "Unknown company"}
          </p>

          <p className="text-sm mt-2">
            Applied on:{" "}
            {new Date(application.createdAt).toLocaleDateString()}
          </p>

          <div className="mt-3">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
              {application.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      </div>
    </div>
  );
}
