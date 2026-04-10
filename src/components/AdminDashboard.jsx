import React, { useState, useEffect } from 'react';
import { auth } from "../firebase";
import { 
  Users, 
  BarChart3, 
  Shield, 
  Download, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  FileText,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to exit admin dashboard and return to main dashboard
  const exitAdminDashboard = () => {
    window.location.reload(); // Reloads the page to show main dashboard
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to access admin dashboard');
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      
      let endpoint = '';
      switch (activeTab) {
        case 'overview':
          endpoint = '/api/admin/analytics/comprehensive';
          break;
        case 'users':
          endpoint = '/api/admin/users';
          break;
        case 'scans':
          endpoint = '/api/admin/scans/history?limit=50';
          break;
        default:
          endpoint = '/api/admin/analytics/comprehensive';
      }

      console.log(` Fetching admin data from: ${endpoint}`);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin privileges required. You do not have access to this dashboard.');
        }
        throw new Error(`Admin API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(` Admin data received:`, data);
      
      switch (activeTab) {
        case 'overview':
          setAnalytics(data);
          break;
        case 'users':
          setUsers(data.users || []);
          break;
        case 'scans':
          setScans(data.scans || []);
          break;
      }
      
      setError('');
    } catch (err) {
      console.error(' Admin data fetch error:', err);
      setError(err.message || 'Failed to load admin data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/export/all-data`, {
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        method: 'POST'
      });

      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishnet-system-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError('Failed to export data: ' + err.message);
    }
  };

  const refreshData = () => {
    fetchAdminData();
  };

  if (loading && activeTab === 'overview') {
    return <AdminLoadingSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Exit Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={exitAdminDashboard}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
            Exit Admin
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              System-wide analytics and user management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportAllData}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Export All Data
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button 
            onClick={fetchAdminData}
            className="mt-2 bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'System Overview', icon: BarChart3 },
            { id: 'users', name: 'User Management', icon: Users },
            { id: 'scans', name: 'All Scans', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} loading={loading} />}
        {activeTab === 'users' && <UsersTab users={users} loading={loading} />}
        {activeTab === 'scans' && <ScansTab scans={scans} loading={loading} />}
      </div>
    </div>
  );
}

// Sub-components
function AdminLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ analytics, loading }) {
  if (loading || !analytics) return <AdminLoadingSkeleton />;

  const stats = analytics.global_stats || {};
  const performance = analytics.system_performance || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          title="Total Users"
          value={stats.total_users?.toLocaleString() || '0'}
          change={`${stats.new_users_7d || 0} new this week`}
          color="blue"
        />
        <MetricCard
          icon={Activity}
          title="Total Scans"
          value={stats.total_scans?.toLocaleString() || '0'}
          change={`${stats.recent_scans_7d || 0} recent scans`}
          color="purple"
        />
        <MetricCard
          icon={Shield}
          title="Phishing Rate"
          value={`${stats.phishing_rate || 0}%`}
          change={`${stats.total_phishing || 0} detected`}
          color="red"
        />
        <MetricCard
          icon={UserCheck}
          title="Active Users"
          value={stats.active_users?.toLocaleString() || '0'}
          change={`${stats.activity_rate || 0}% active rate`}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            User Activity Distribution
          </h3>
          <div className="space-y-4">
            {analytics.user_activity?.activity_distribution ? (
              Object.entries(analytics.user_activity.activity_distribution).map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <span className="capitalize text-gray-600 dark:text-gray-400">
                    {level.replace('_', ' ')} Activity
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{count} users</span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          level === 'high_activity' ? 'bg-green-500' :
                          level === 'medium_activity' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(count / stats.total_users) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No activity data available</p>
            )}
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            System Performance
          </h3>
          <div className="space-y-3">
            <PerformanceMetric
              label="Average Confidence"
              value={`${performance.average_confidence?.toFixed(1) || '0'}%`}
              color="blue"
            />
            <PerformanceMetric
              label="Average Danger Score"
              value={`${performance.average_danger_score?.toFixed(1) || '0'}%`}
              color="orange"
            />
            <PerformanceMetric
              label="URLs Analyzed"
              value={performance.total_urls_analyzed?.toLocaleString() || '0'}
              color="green"
            />
            <PerformanceMetric
              label="Malicious URLs"
              value={performance.malicious_urls || '0'}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Top Users */}
      {analytics.user_activity?.top_users && analytics.user_activity.top_users.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Active Users</h3>
          <div className="space-y-3">
            {analytics.user_activity.top_users.slice(0, 5).map((user, index) => (
              <div key={user.email} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{user.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.activity_level} activity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{user.scan_count} scans</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Time */}
      {analytics._metadata && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Data generated {new Date(analytics._metadata.generated_at).toLocaleString()} • 
          Response time: {analytics._metadata.response_time}s
        </div>
      )}
    </div>
  );
}

function UsersTab({ users, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">User Management</h2>
        <p className="text-gray-600 dark:text-gray-400">{users.length} users in system</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">Joined</th>
              <th className="text-left p-4 font-semibold">Last Active</th>
              <th className="text-left p-4 font-semibold">Total Scans</th>
              <th className="text-left p-4 font-semibold">Phishing Rate</th>
              <th className="text-left p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{user.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.display_name || 'No display name'}</p>
                  </div>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  {user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}
                </td>
                <td className="p-4">
                  <span className="font-semibold">{user.stats.total_scans}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.stats.email_scans} email, {user.stats.text_scans} text
                  </div>
                </td>
                <td className="p-4">
                  <span className={`font-semibold ${
                    user.stats.phishing_rate > 30 ? 'text-red-600' :
                    user.stats.phishing_rate > 10 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {user.stats.phishing_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.stats.total_scans > 0 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {user.stats.total_scans > 0 ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScansTab({ scans, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">All User Scans</h2>
        <p className="text-gray-600 dark:text-gray-400">{scans.length} recent scans</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">Date</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-left p-4 font-semibold">Result</th>
              <th className="text-left p-4 font-semibold">Danger Score</th>
              <th className="text-left p-4 font-semibold">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {scans.map(scan => (
              <tr key={scan.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-4">
                  <p className="font-semibold text-gray-900 dark:text-white">{scan.user_email}</p>
                </td>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  {new Date(scan.created_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span className="capitalize">{scan.scan_source || 'image_upload'}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    scan.is_phishing 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {scan.is_phishing ? 'PHISHING' : 'LEGITIMATE'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`font-semibold ${
                    scan.danger_score > 0.7 ? 'text-red-600' :
                    scan.danger_score > 0.3 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {(scan.danger_score * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    {(scan.model_confidence * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ icon: Icon, title, value, change, color }) {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-600 dark:text-blue-400',
    purple: 'border-purple-500 text-purple-600 dark:text-purple-400', 
    red: 'border-red-500 text-red-600 dark:text-red-400',
    green: 'border-green-500 text-green-600 dark:text-green-400',
    orange: 'border-orange-500 text-orange-600 dark:text-orange-400'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={colorClasses[color].split(' ')[1]} size={24} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{change}</p>
    </div>
  );
}

function PerformanceMetric({ label, value, color }) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400', 
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400'
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}