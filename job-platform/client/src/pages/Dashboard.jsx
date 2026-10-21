import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, setUser, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await api.post("/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, resume: res.data.resume });
      setMsg("Resume uploaded successfully ✅");
      setFile(null);
    } catch (err) {
      setMsg(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const onView = async () => {
    const res = await api.get("/resume", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    window.open(url, "_blank");
  };

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Hi, {user?.name} 👋</h1>
          <button onClick={onLogout} className="text-sm text-red-600 hover:underline">
            Logout
          </button>
        </div>

        <h2 className="font-semibold mb-2">Your Resume</h2>

        {user?.resume ? (
          <div className="bg-green-50 border border-green-200 p-3 rounded mb-4 text-sm">
            📄 {user.resume.originalName} ({(user.resume.size / 1024).toFixed(1)} KB)
            <button onClick={onView} className="ml-3 text-blue-600 hover:underline">
              View
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">No resume uploaded yet.</p>
        )}

        <form onSubmit={onUpload} className="space-y-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm border p-2 rounded"
          />
          <button
            disabled={!file || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Resume (PDF)"}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm">{msg}</p>}
      </div>
    </div>
  );
}