// components/Sidebar.jsx - FINAL VERSION WITH PROPER DARK MODE
import React, { useState } from "react";
import { 
  Image, 
  History, 
  BarChart3, 
  Download, 
  Settings, 
  User, 
  LogOut,
  Shield,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar({ setActiveSection, activeSection, isAdmin = false }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation items - regular users see these
  const regularNavItems = [
    { id: "imageocr", label: "Scan Email Image", icon: Image },
    { id: "history", label: "Scan History", icon: History },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "export", label: "Export Data", icon: Download },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "profile", label: "Profile", icon: User },
    { id: "logout", label: "Logout", icon: LogOut },
  ];

  // Admin-only navigation item
  const adminNavItem = {
    id: "admin",
    label: "Admin Dashboard", 
    icon: Shield,
  };

  // Combine items - only include admin item if user is admin
  const navItems = isAdmin 
    ? [...regularNavItems, adminNavItem] 
    : regularNavItems;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (sectionId) => {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-lg bg-purple-600 text-white shadow-md border border-purple-700 dark:bg-gray-800 dark:border-gray-700"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gradient-to-b from-purple-600 to-purple-700 shadow-xl
        transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-900
      `}>
        {/* Logo/Brand */}
        <div className="p-6 border-b border-purple-500 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-white dark:text-white">
              PhishNet
            </h1>
            <p className="text-sm text-purple-200 dark:text-gray-300">
              Email Security Scanner
            </p>
          </div>
          
          {isAdmin && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-purple-600 dark:bg-gray-700 dark:text-gray-200">
                <Shield size={12} className="mr-1" />
                Administrator
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                ${activeSection === item.id
                  ? 'bg-white text-purple-600 shadow-md dark:bg-gray-700 dark:text-white'
                  : 'text-purple-100 hover:bg-purple-500 hover:text-white dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}