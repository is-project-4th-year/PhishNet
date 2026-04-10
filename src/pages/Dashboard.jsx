// components/Dashboard.jsx - WITH URL PARAMETER SUPPORT
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { useLocation } from "react-router-dom"; //  Add this import
import Sidebar from "../components/Sidebar";
import ImageOCRSection from "../sections/ImageOCRSection";
import HistorySection from "../sections/HistorySection";
import AnalyticsSection from "../sections/AnalyticsSection";
import ExportSection from "../sections/ExportSection";
import SettingsSection from "../sections/SettingsSection";
import ProfileSection from "../sections/ProfileSection";
import LogoutSection from "../sections/LogoutSection";
import AdminDashboard from "../components/AdminDashboard";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("imageocr");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [highlightScanId, setHighlightScanId] = useState(null); //  For highlighting specific scan
  
  const location = useLocation(); //  Get URL location

  //  NEW: Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const scanParam = params.get('scan');
    
    console.log(' URL Parameters:', { tab: tabParam, scan: scanParam });
    
    // If tab parameter exists, switch to that tab
    if (tabParam) {
      console.log(' Switching to tab:', tabParam);
      setActiveSection(tabParam);
    }
    
    // If scan parameter exists, store it to highlight the scan
    if (scanParam) {
      console.log('🎯 Will highlight scan:', scanParam);
      setHighlightScanId(scanParam);
    }
  }, [location.search]);

  // SIMPLE ADMIN DETECTION - GUARANTEED TO WORK
  const checkAdminStatus = () => {
    const user = auth.currentUser;
    if (!user) {
      setIsAdmin(false);
      return;
    }

    console.log(" Checking admin status for:", user.email);
    
    // FORCE ADMIN FOR YOUR EMAIL - THIS WILL DEFINITELY WORK
    const adminEmails = [
      "superadmin@phishnet.com",
      "admin@phishnet.com", 
      "administrator@phishnet.com"
    ];
    
    const userIsAdmin = adminEmails.includes(user.email.toLowerCase());
    
    if (userIsAdmin) {
      console.log("🎯 USER IS ADMIN - SHOWING ADMIN DASHBOARD");
      setIsAdmin(true);
    } else {
      console.log("👤 User is regular user");
      setIsAdmin(false);
    }
  };

  // Fetch user data from database
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      console.log("Fetching profile with token...");
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log("Profile response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const data = await response.json();
      console.log("User data received:", data);
      setUserData(data);

      // Sync to extension storage
      if (chrome?.storage?.local) {
        chrome.storage.local.set({
          hasBackendUser: true,
          hasBackendToken: true,
          backendUserType: data.role,
          backendTokenType: 'jwt',
          userEmail: data.email,
          userName: data.display_name
        }, () => {
          console.log(' User data synced to extension storage');
        });
      }

    } catch (err) {
      console.error("Error fetching user data:", err);
      setUserData({
        email: auth.currentUser?.email || "user@example.com",
        display_name: auth.currentUser?.displayName || "User"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      checkAdminStatus();
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // If user is admin AND they selected admin section, show Admin Dashboard
  if (isAdmin && activeSection === "admin") {
    console.log(" RENDERING ADMIN DASHBOARD");
    return <AdminDashboard />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "imageocr":
        return <ImageOCRSection />;
      case "history":
        //  Pass highlightScanId to HistorySection
        return <HistorySection highlightScanId={highlightScanId} />;
      case "analytics":
        return <AnalyticsSection />;
      case "export":
        return <ExportSection />;
      case "settings":
        return <SettingsSection />;
      case "profile":
        return <ProfileSection userData={userData} />;
      case "logout":
        return <LogoutSection />;
      case "admin":
        return <AdminDashboard />;
      default:
        return <ImageOCRSection />;
    }
  };

  const displayName = userData?.display_name || auth.currentUser?.displayName || "User";
  const firstName = displayName.split(" ")[0];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  console.log(" Rendering:", isAdmin ? "ADMIN MODE" : "USER MODE", "for:", auth.currentUser?.email);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar navigation */}
      <Sidebar setActiveSection={setActiveSection} activeSection={activeSection} isAdmin={isAdmin} />

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Dashboard Header with ADMIN indicator */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
            {firstName}'s Dashboard
            {isAdmin && (
              <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700">
                 ADMIN MODE
              </span>
            )}
          </h1>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {activeSection === 'imageocr' ? 'Scan Email Image' : 
             activeSection === 'history' ? 'Scan History' :
             activeSection.replace('ocr', 'OCR')}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}