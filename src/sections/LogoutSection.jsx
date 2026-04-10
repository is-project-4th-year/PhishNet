import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function LogoutSection() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLoading(true);
    try {
      // 1. Sign out from Firebase
      await signOut(auth);
      
      // 2. Clear local storage
      localStorage.removeItem("authToken");
      
      // 3. Clear extension storage (if extension is installed)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          await chrome.storage.local.remove([
            'backendUser', 'backendToken', 'firebaseUser', 'authToken',
            'hasBackendUser', 'hasBackendToken', 'userEmail', 'userName',
            'backendUserType', 'backendTokenType'
          ]);
          console.log(" Extension storage cleared");
        } catch (err) {
          console.log(" Extension not available or already cleared");
        }
      }
      
      console.log(" User logged out successfully");
      navigate("/login");
    } catch (err) {
      console.error(" Logout failed:", err);
      alert("Failed to logout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center justify-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Logout</h2>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            Click the button below to log out of your account.
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            "Logging out..."
          ) : (
            <>
              <LogOut size={20} />
              Logout
            </>
          )}
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Thank you for using PhishNet!</p>
      </div>
    </div>
  );
}