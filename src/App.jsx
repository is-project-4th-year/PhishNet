// App.jsx - FINAL VERSION (Extension sync handled by Login.jsx)
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import ForgotPassword from "./components/Auth/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./components/AdminDashboard";

import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  // Extension sync is now handled in Login.jsx
  // No need for auth state listener here
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public (no login required) */}
        <Route element={<ProtectedRoute requireAuth={false} />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
        </Route>

        {/* Protected (login required) */}
        <Route element={<ProtectedRoute requireAuth={true} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}