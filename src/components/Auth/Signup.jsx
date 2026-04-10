import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Check, X, Shield } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { auth, googleProvider, githubProvider } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchProfile } from "../../api";

// Helper function to sync with extension
function syncWithExtension(user, token) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    try {
      // Get extension ID from manifest - you'll need to update this
      const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE'; // Get from chrome://extensions
      
      console.log(' Syncing auth with extension...');
      
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          action: 'backendAuthenticated',
          user: {
            id: user.uid,
            email: user.email,
            display_name: user.displayName || user.email.split('@')[0],
            firebase_uid: user.uid
          },
          token: token
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(' Extension not installed or not responding');
          } else {
            console.log(' Extension synced:', response);
          }
        }
      );
    } catch (error) {
      console.log(' Extension sync error:', error);
    }
  }
}

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if user came from extension
  const fromExtension = searchParams.get('source') === 'extension';
  const shouldRedirect = searchParams.get('redirect') === 'extension';

  const requirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "1 uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", valid: /[a-z]/.test(password) },
    { label: "1 number", valid: /\d/.test(password) },
    { label: "1 special character", valid: /[!@#$%^&*(),.?\":{}|<>]/.test(password) },
  ];

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!requirements.every((r) => r.valid)) {
      setError("Please meet all password requirements.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Get token for backend
      const token = await userCredential.user.getIdToken();

      //  Sync user to backend PostgreSQL
      try {
        await fetchProfile();
        console.log(" User synced to backend successfully!");
      } catch (err) {
        console.error(" Backend sync failed:", err);
      }

      //  Sync with extension if user came from extension
      if (fromExtension) {
        syncWithExtension(userCredential.user, token);
        setSuccess("Account created! Extension synced. You can close this tab.");
        
        // Don't sign out if from extension, let them stay logged in
        setTimeout(() => {
          window.close(); // Try to close the tab
        }, 2000);
      } else {
        // Regular signup flow - sign out and redirect to login
        await auth.signOut();
        setSuccess("Account created successfully! Please log in.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignup = async (providerName, provider) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      
      await fetchProfile();
      
      //  Sync with extension if user came from extension
      if (fromExtension) {
        syncWithExtension(result.user, token);
        setSuccess(`Account created with ${providerName}! Extension synced. You can close this tab.`);
        
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // Regular flow
        await auth.signOut();
        setSuccess(`Account created successfully with ${providerName}! Please log in.`);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-white">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md border border-purple-200">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="text-purple-600" size={28} />
          <h2 className="text-3xl font-semibold text-purple-700">
            Create Your Account
          </h2>
        </div>

        {error && <p className="text-red-600 text-sm text-center mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm text-center mb-3">{success}</p>}

        <form className="space-y-5" onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-purple-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-purple-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="font-medium text-purple-700 mb-2">
              Password Requirements:
            </p>
            <ul className="space-y-1">
              {requirements.map((req, i) => (
                <li key={i} className="flex items-center gap-2">
                  {req.valid ? (
                    <Check className="text-green-500" size={16} />
                  ) : (
                    <X className="text-red-400" size={16} />
                  )}
                  <span className={req.valid ? "text-green-600" : "text-gray-600"}>
                    {req.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition duration-300 font-medium disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <div className="flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => handleProviderSignup("Google", googleProvider)}
              className="flex items-center justify-center gap-2 w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <FcGoogle size={20} /> Sign up with Google
            </button>

            <button
              type="button"
              onClick={() => handleProviderSignup("GitHub", githubProvider)}
              className="flex items-center justify-center gap-2 w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <FaGithub size={20} className="text-gray-800" /> Sign up with GitHub
            </button>
          </div>

          <p className="text-center text-gray-600 text-sm">
            Already have an account?{" "}
            <a 
              href={fromExtension ? `/login?source=extension&redirect=extension` : "/login"} 
              className="text-purple-700 hover:underline"
            >
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}