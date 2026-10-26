import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

// Keep in sync with LIMITS in server/controllers/profileController.js
const MAX = {
    name: 80,
    headline: 120,
    bio: 2000,
    location: 100,
    phone: 30,
    url: 200,
    companyName: 100,
    position: 100,
    companyBio: 2000,
};

const toForm = (p, isApplicant) =>
    isApplicant
        ? {
            name: p.name || "",
            headline: p.headline || "",
            bio: p.bio || "",
            location: p.location || "",
            phone: p.phone || "",
            skills: (p.skills || []).join(", "),
            links: {
                linkedin: p.links?.linkedin || "",
                github: p.links?.github || "",
                portfolio: p.links?.portfolio || "",
            },
        }
        : {
            name: p.name || "",
            companyName: p.companyName || "",
            position: p.position || "",
            companyWebsite: p.companyWebsite || "",
            companyBio: p.companyBio || "",
            location: p.location || "",
            phone: p.phone || "",
        };

const parseSkills = (s) => {
    const seen = new Set();
    return s
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
};

export default function Profile() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const isApplicant = (user?.role || "applicant") === "applicant";

    const [form, setForm] = useState(null);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null); // { type: "ok" | "error", text }

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/profile");
                const p = res.data.profile;
                setEmail(p.email);
                setForm(toForm(p, isApplicant));
            } catch (err) {
                setMsg({ type: "error", text: err.response?.data?.message || "Could not load profile" });
            } finally {
                setLoading(false);
            }
        })();
    }, [isApplicant]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setMsg(null);
        if (name.startsWith("links.")) {
            const key = name.split(".")[1];
            setForm((f) => ({ ...f, links: { ...f.links, [key]: value } }));
        } else {
            setForm((f) => ({ ...f, [name]: value }));
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const res = await api.put("/profile", form);
            const p = res.data.profile;
            setUser({ ...user, ...p });
            setForm(toForm(p, isApplicant)); // show what the server stored
            setMsg({ type: "ok", text: "Profile saved ✅" });
        } catch (err) {
            setMsg({ type: "error", text: err.response?.data?.message || "Save failed" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 p-6 text-gray-500">Loading profile...</div>;
    }

    if (!form) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <p className="text-red-600 text-sm">{msg?.text}</p>
                <button onClick={() => navigate("/dashboard")} className="mt-3 text-sm text-blue-600 hover:underline">
                    Back to dashboard
                </button>
            </div>
        );
    }

    const skillsPreview = isApplicant ? parseSkills(form.skills) : [];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">
                        {isApplicant ? "Your profile" : "Recruiter profile"}
                    </h1>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Back to dashboard
                    </button>
                </div>

                {isApplicant && (
                    <p className="text-sm text-gray-500 mb-4">
                        Recruiters see this when you apply to one of their jobs.
                    </p>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                    <Field label="Full name" name="name" value={form.name} onChange={onChange} maxLength={MAX.name} required />
                    <label className="block text-sm">
                        <span className="block mb-1 font-medium text-gray-700">Email</span>
                        <input value={email} disabled className="w-full border p-2 rounded bg-gray-50 text-gray-500" />
                    </label>

                    {isApplicant ? (
                        <>
                            <Field label="Headline" name="headline" value={form.headline} onChange={onChange} maxLength={MAX.headline} placeholder="Frontend Developer" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Location" name="location" value={form.location} onChange={onChange} maxLength={MAX.location} placeholder="Montreal, QC" />
                                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} maxLength={MAX.phone} placeholder="+1 555 123 4567" />
                            </div>
                            <div>
                                <Field label="Skills (comma separated)" name="skills" value={form.skills} onChange={onChange} placeholder="React, Node, MongoDB" />
                                {skillsPreview.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {skillsPreview.map((s) => (
                                            <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Field label="LinkedIn" name="links.linkedin" value={form.links.linkedin} onChange={onChange} maxLength={MAX.url} inputMode="url" placeholder="linkedin.com/in/your-name" />
                            <Field label="GitHub" name="links.github" value={form.links.github} onChange={onChange} maxLength={MAX.url} inputMode="url" placeholder="github.com/your-name" />
                            <Field label="Portfolio" name="links.portfolio" value={form.links.portfolio} onChange={onChange} maxLength={MAX.url} inputMode="url" placeholder="your-site.com" />
                            <TextArea label="Bio" name="bio" value={form.bio} onChange={onChange} maxLength={MAX.bio} />
                        </>
                    ) : (
                        <>
                            <Field label="Company name" name="companyName" value={form.companyName} onChange={onChange} maxLength={MAX.companyName} required placeholder="Acme Inc." />
                            <Field label="Position / Title" name="position" value={form.position} onChange={onChange} maxLength={MAX.position} placeholder="Engineering Manager" />
                            <Field label="Company website" name="companyWebsite" value={form.companyWebsite} onChange={onChange} maxLength={MAX.url} inputMode="url" placeholder="acme.com" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Location" name="location" value={form.location} onChange={onChange} maxLength={MAX.location} placeholder="Remote" />
                                <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} maxLength={MAX.phone} placeholder="+1 555 123 4567" />
                            </div>
                            <TextArea label="About the company" name="companyBio" value={form.companyBio} onChange={onChange} maxLength={MAX.companyBio} />
                        </>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            disabled={saving}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                        {msg && (
                            <span className={`text-sm ${msg.type === "error" ? "text-red-600" : "text-green-700"}`}>
                                {msg.text}
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, placeholder, type = "text", maxLength, required, inputMode }) {
    return (
        <label className="block text-sm">
            <span className="block mb-1 font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                inputMode={inputMode}
                className="w-full border p-2 rounded"
            />
        </label>
    );
}

function TextArea({ label, name, value, onChange, maxLength }) {
    return (
        <label className="block text-sm">
            <span className="block mb-1 font-medium text-gray-700">{label}</span>
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                maxLength={maxLength}
                rows={4}
                className="w-full border p-2 rounded"
            />
            {maxLength && (
                <span className="block text-right text-xs text-gray-400 mt-1">
                    {value.length}/{maxLength}
                </span>
            )}
        </label>
    );
}
