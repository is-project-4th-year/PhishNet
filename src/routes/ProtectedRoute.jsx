import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../firebase";

/**
 * ProtectedRoute wraps routes that require authentication.
 * - If requireAuth=true, redirects unauthenticated users to /login
 * - If requireAuth=false, redirects logged-in users to /dashboard
 * - Saves token in localStorage for backend use
 */
export default function ProtectedRoute({ requireAuth = true }) {
  const [user, setUser] = useState(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const token = await getIdToken(currentUser, true);
          localStorage.setItem("authToken", token); //  Save for backend API calls
        } catch (err) {
          console.error("Failed to get token:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("authToken");
      }
    });
    return () => unsubscribe();
  }, []);

  // Still loading Firebase auth state
  if (user === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  // Require authentication but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Public route (login/signup) but user already logged in
  if (!requireAuth && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}