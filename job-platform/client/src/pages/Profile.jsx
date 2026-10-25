import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const isApplicant = user?.role === "applicant";

    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/profile");
                const p = res.data.profile;
                setForm(
                    isApplicant
                        ? {
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
                            companyName: p.companyName || "",
                            position: p.position || "",
                            companyWebsite: p.companyWebsite || "",
                            companyBio: p.companyBio || "",
                            location: p.location || "",
                            phone: p.phone || "",
                        }
                );
            } catch (err) {
                setMsg(err.response?.data?.message || "Could not load profile");
            } finally {
                setLoading(false);
            }
        })();
    }, [isApplicant]);

    const onChange = (e) => {
        const { name, value } = e.target;
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
        setMsg("");
        try {
            const res = await api.put("/profile", form);
            setUser({ ...user, ...res.data.profile });
            setMsg("Profile saved ✅");
        } catch (err) {
            setMsg(err.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !form) {
        return <div className="min-h-screen bg-gray-50 p-6 text-gray-500">Loading profile...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">
                        {isApplicant ? "Applicant profile" : "Recruiter profile"}
                    </h1>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        Back
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    {isApplicant ? (
                        <>
                            <Field label="Headline" name="headline" value={form.headline} onChange={onChange} placeholder="Frontend Developer" />
                            <Field label="Location" name="location" value={form.location} onChange={onChange} placeholder="Montreal, QC" />
                            <Field label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 123 4567" />
                            <Field label="Skills (comma separated)" name="skills" value={form.skills} onChange={onChange} placeholder="React, Node, MongoDB" />
                            <Field label="LinkedIn" name="links.linkedin" value={form.links.linkedin} onChange={onChange} placeholder="https://linkedin.com/in/..." />
                            <Field label="GitHub" name="links.github" value={form.links.github} onChange={onChange} placeholder="https://github.com/..." />
                            <Field label="Portfolio" name="links.portfolio" value={form.links.portfolio} onChange={onChange} placeholder="https://..." />
                            <TextArea label="Bio" name="bio" value={form.bio} onChange={onChange} />
                        </>
                    ) : (
                        <>
                            <Field label="Company name" name="companyName" value={form.companyName} onChange={onChange} placeholder="Acme Inc." />
                            <Field label="Position / Title" name="position" value={form.position} onChange={onChange} placeholder="Engineering Manager" />
                            <Field label="Company website" name="companyWebsite" value={form.companyWebsite} onChange={onChange} placeholder="https://acme.com" />
                            <Field label="Location" name="location" value={form.location} onChange={onChange} placeholder="Remote" />
                            <Field label="Phone" name="phone" value={form.phone} onChange={onChange} placeholder="+1 555 123 4567" />
                            <TextArea label="About the company" name="companyBio" value={form.companyBio} onChange={onChange} />
                        </>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            disabled={saving}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                        {msg && <span className="text-sm">{msg}</span>}
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, name, value, onChange, placeholder }) {
    return (
        <label className="block text-sm">
            <span className="block mb-1 font-medium text-gray-700">{label}</span>
            <input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full border p-2 rounded"
            />
        </label>
    );
}

function TextArea({ label, name, value, onChange }) {
    return (
        <label className="block text-sm">
            <span className="block mb-1 font-medium text-gray-700">{label}</span>
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                rows={4}
                className="w-full border p-2 rounded"
            />
        </label>
    );
}