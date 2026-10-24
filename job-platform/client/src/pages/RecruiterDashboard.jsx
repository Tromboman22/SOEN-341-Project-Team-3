import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/recruiter/StatCard";
import JobForm from "../components/recruiter/JobForm";
import ApplicationsPanel from "../components/recruiter/ApplicationsPanel";

const STATUS_STYLES = {
  open: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  closed: "bg-red-100 text-red-700",
};

export default function RecruiterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | job
  const [viewingJob, setViewingJob] = useState(null);

  const load = useCallback(async () => {
    try {
      const [j, s] = await Promise.all([
        api.get("/recruiter/jobs"),
        api.get("/recruiter/stats"),
      ]);
      setJobs(j.data.jobs);
      setStats(s.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveJob = async (data) => {
    if (editing === "new") await api.post("/recruiter/jobs", data);
    else await api.put(`/recruiter/jobs/${editing._id}`, data);
    setEditing(null);
    load();
  };

  const setStatus = async (job, status) => {
    try {
      await api.put(`/recruiter/jobs/${job._id}`, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update job");
    }
  };

  const removeJob = async (job) => {
    if (!confirm(`Delete "${job.title}" and all its applications?`)) return;
    try {
      await api.delete(`/recruiter/jobs/${job._id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete job");
    }
  };

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const visible = jobs.filter((j) => filter === "all" || j.status === filter);
  const byStatus = stats?.applicationsByStatus ?? {};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Recruiter dashboard</h1>
            <p className="text-sm text-gray-500">
              {user?.name} · {user?.companyName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditing("new")}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              + New job
            </button>
            <button onClick={onLogout} className="text-sm text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </header>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total jobs" value={stats?.totalJobs} />
          <StatCard label="Open jobs" value={stats?.openJobs} />
          <StatCard label="Applications" value={stats?.totalApplications} />
          <StatCard
            label="Shortlisted"
            value={byStatus.shortlisted ?? 0}
            hint={`${byStatus.hired ?? 0} hired`}
          />
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 className="font-semibold">Your job postings</h2>
            <div className="flex gap-1 text-sm">
              {["all", "open", "draft", "closed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded capitalize ${
                    filter === f ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading...</p>
          ) : visible.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              {jobs.length === 0 ? "You haven't posted any jobs yet." : "No jobs match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map((job) => (
                <li key={job._id} className="p-4 flex flex-wrap justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{job.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[job.status]}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {[job.location, job.remote && "Remote", job.type].filter(Boolean).join(" · ")}
                      {job.deadline && ` · closes ${new Date(job.deadline).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => setViewingJob(job)} className="text-blue-600 hover:underline">
                      {job.applicationCount} applicant{job.applicationCount === 1 ? "" : "s"}
                    </button>
                    {job.status === "open" ? (
                      <button onClick={() => setStatus(job, "closed")} className="text-gray-600 hover:underline">Close</button>
                    ) : (
                      <button onClick={() => setStatus(job, "open")} className="text-gray-600 hover:underline">Publish</button>
                    )}
                    <button onClick={() => setEditing(job)} className="text-gray-600 hover:underline">Edit</button>
                    <button onClick={() => removeJob(job)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <JobForm
          job={editing === "new" ? null : editing}
          onSave={saveJob}
          onCancel={() => setEditing(null)}
        />
      )}
      {viewingJob && (
        <ApplicationsPanel job={viewingJob} onClose={() => setViewingJob(null)} onChanged={load} />
      )}
    </div>
  );
}
