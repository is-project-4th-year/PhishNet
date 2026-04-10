import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SettingsSection() {
  const { theme, toggleTheme } = useTheme();

  const handleThemeChange = (e) => {
    toggleTheme(e.target.value);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Settings</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Adjust your preferences and app configurations below.
        </p>

        {/* Theme Setting */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-600">
          <label className="block mb-2 font-medium text-gray-900 dark:text-white">Theme</label>
          <select 
            value={theme}
            onChange={handleThemeChange}
            className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
            Choose between light and dark theme
          </p>
        </div>
      </div>
    </div>
  );
}