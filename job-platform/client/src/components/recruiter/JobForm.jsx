import { useState } from "react";

const TYPES = ["full-time", "part-time", "contract", "internship"];
const STATUSES = ["draft", "open", "closed"];

const toForm = (job) => ({
  title: job?.title ?? "",
  location: job?.location ?? "",
  remote: job?.remote ?? false,
  type: job?.type ?? "full-time",
  status: job?.status ?? "open",
  description: job?.description ?? "",
  requirements: (job?.requirements ?? []).join("\n"),
  salaryMin: job?.salaryMin ?? "",
  salaryMax: job?.salaryMax ?? "",
  deadline: job?.deadline ? job.deadline.slice(0, 10) : "",
});

export default function JobForm({ job, onSave, onCancel }) {
  const [form, setForm] = useState(toForm(job));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
        salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
        deadline: form.deadline || null,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not save job");
      setSaving(false);
    }
  };

  const input = "w-full border border-gray-300 p-2 rounded text-sm";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 overflow-y-auto z-50">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 space-y-3 my-8">
        <h2 className="text-xl font-bold">{job ? "Edit job posting" : "New job posting"}</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}

        <input name="title" value={form.title} onChange={set} placeholder="Job title" required className={input} />
        <div className="grid grid-cols-2 gap-3">
          <input name="location" value={form.location} onChange={set} placeholder="Location" className={input} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remote" checked={form.remote} onChange={set} /> Remote friendly
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select name="type" value={form.type} onChange={set} className={input}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select name="status" value={form.status} onChange={set} className={input}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <textarea name="description" value={form.description} onChange={set} placeholder="Description" required rows={4} className={input} />
        <textarea name="requirements" value={form.requirements} onChange={set} placeholder="Requirements (one per line)" rows={3} className={input} />
        <div className="grid grid-cols-3 gap-3">
          <input name="salaryMin" type="number" min="0" value={form.salaryMin} onChange={set} placeholder="Salary min" className={input} />
          <input name="salaryMax" type="number" min="0" value={form.salaryMax} onChange={set} placeholder="Salary max" className={input} />
          <input name="deadline" type="date" value={form.deadline} onChange={set} className={input} title="Application deadline" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
          <button disabled={saving} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
