import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Missing reset token. Request a new reset link.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={onSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-3 text-center">Set New Password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Choose a new password for your account.
        </p>
        {!token && (
          <div role="alert" className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            Missing reset token. Request a new reset link.
          </div>
        )}
        {message && (
          <div role="status" className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">
            {message}
          </div>
        )}
        {error && token && (
          <div role="alert" className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <label htmlFor="new-password" className="block text-sm font-medium mb-1">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
          disabled={!token || Boolean(message)}
          className="w-full border p-2 rounded mb-3"
        />
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium mb-1"
        >
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
          disabled={!token || Boolean(message)}
          className="w-full border p-2 rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading || !token || Boolean(message)}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
        <p className="text-center text-sm mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
