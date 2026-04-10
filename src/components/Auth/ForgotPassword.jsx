import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react"; // cute lock icon

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "If an account with this email exists, a password reset link has been sent. Check your inbox or spam folder."
      );
    } catch (err) {
      setMessage("Failed to send reset email. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <Lock className="text-purple-600 w-12 h-12 mb-2" />
          <h2 className="text-2xl font-bold text-center text-purple-700">
            Reset Password
          </h2>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Enter your email to receive a password reset link
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 text-center text-sm px-3 py-2 rounded-lg ${
              message.startsWith("")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Enter your email"
            required
            className="w-full p-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition duration-200 ${
              loading
                ? "bg-purple-300 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Remembered your password?{" "}
          <Link to="/login" className="text-purple-600 font-semibold hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
