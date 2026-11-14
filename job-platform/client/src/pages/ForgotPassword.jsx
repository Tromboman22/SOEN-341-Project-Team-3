import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      const token = res.data.resetToken || "";
      setResetToken(token);
      setMessage(
        token
          ? "A reset token was generated successfully. Use it below to set a new password."
          : "If an account exists for this email, a reset token has been generated."
      );
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Reset Password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email address and we will generate a reset token for you.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {resetToken && (
          <div className="bg-gray-100 border border-gray-200 p-3 rounded mb-4 text-sm break-all">
            <div className="font-semibold mb-1">Reset token:</div>
            <div>{resetToken}</div>
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border p-2 rounded mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset token"}
        </button>

        {resetToken && (
          <button
            type="button"
            className="w-full mt-3 bg-gray-200 text-gray-800 p-2 rounded hover:bg-gray-300"
            onClick={() => navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
          >
            Continue to reset password
          </button>
        )}

        <p className="text-center text-sm mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
