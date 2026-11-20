import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to request a password reset"
      );
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
        <h1 className="text-2xl font-bold mb-3 text-center">Forgot password?</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email and we’ll send a reset link if an account exists.
        </p>
        {message && (
          <div role="status" className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <label htmlFor="reset-email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full border p-2 rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
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
