// // components/AnalyticsSection.jsx - ENHANCED VERSION
// import React, { useState, useEffect } from 'react';
// import { auth } from "../firebase";
// import { 
//   BarChart3, 
//   AlertTriangle, 
//   CheckCircle, 
//   Shield, 
//   Link,
//   Calendar,
//   TrendingUp,
//   FileText,
//   RefreshCw,
//   Zap,
//   PieChart,
//   Activity,
//   Target,
//   Clock
// } from 'lucide-react';

// export default function AnalyticsSection() {
//   const [analytics, setAnalytics] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [timeRange, setTimeRange] = useState('30d');

//   useEffect(() => {
//     fetchEnhancedAnalytics();
//   }, [timeRange]);

//   const fetchEnhancedAnalytics = async () => {
//     try {
//       const user = auth.currentUser;
//       if (!user) {
//         setError('Please log in to view analytics');
//         setLoading(false);
//         return;
//       }

//       console.log(' Fetching enhanced analytics...');
//       const token = await user.getIdToken();
      
//       const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/enhanced`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (!response.ok) {
//         throw new Error(`Server returned ${response.status}`);
//       }

//       const data = await response.json();
//       console.log('📈 Enhanced analytics data received:', data);
      
//       // FIX: Update scan counting logic
//       if (data.overview) {
//         // OLD: Probably had text scans as separate type
//         // NEW: Browser extension = Text scans, OCR = Email scans
//         const browserScans = data.scan_breakdown?.by_type?.browser_scan?.count || 0;
//         const ocrScans = data.scan_breakdown?.by_type?.image_upload?.count || 0;
        
//         data.overview.total_text_scans = browserScans; // Browser scans count as Text Scans
//         data.overview.total_email_scans = ocrScans; // OCR scans count as Email Scans
//       }
      
//       setAnalytics(data);
//       setError('');
//     } catch (err) {
//       console.error('Enhanced analytics fetch error:', err);
//       setError('Failed to load analytics data. Using demo data for preview.');
//       setAnalytics(getEnhancedDemoData());
//     } finally {
//       setLoading(false);
//     }
//   };

//   const refreshAnalytics = () => {
//     setLoading(true);
//     setError('');
//     fetchEnhancedAnalytics();
//   };

//   if (loading) {
//     return <LoadingSkeleton />;
//   }

//   if (!analytics?.has_data) {
//     return <NoDataView error={error} onRetry={refreshAnalytics} />;
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <Header onRefresh={refreshAnalytics} error={error} />
      
//       {/* Overview Cards */}
//       <OverviewCards analytics={analytics} />
      
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Scan Activity Trend */}
//         <TrendChart analytics={analytics} />
        
//         {/* Risk Distribution */}
//         <RiskDistribution analytics={analytics} />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Scan Type Breakdown */}
//         <ScanTypeBreakdown analytics={analytics} />
        
//         {/* URL Analysis */}
//         <URLAnalysis analytics={analytics} />
//       </div>

//       {/* Performance Metrics */}
//       <PerformanceMetrics analytics={analytics} />
      
//       {/* Recent High-Risk Scans */}
//       <HighRiskScans analytics={analytics} />
//     </div>
//   );
// }

// // Sub-components for better organization
// function LoadingSkeleton() {
//   return (
//     <div className="p-6">
//       <div className="flex items-center justify-between mb-6">
//         <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h2>
//         <div className="flex items-center gap-2 text-sm text-gray-500">
//           <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
//           Loading enhanced analytics...
//         </div>
//       </div>
//       <div className="animate-pulse space-y-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           {[1, 2, 3, 4].map(i => (
//             <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
//           ))}
//         </div>
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
//           <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function NoDataView({ error, onRetry }) {
//   return (
//     <div className="p-6">
//       <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
//         <FileText className="mx-auto text-blue-400 mb-4" size={48} />
//         <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
//           {error ? 'Analytics Load Failed' : 'No Scan Data Yet'}
//         </h3>
//         <p className="text-blue-700 dark:text-blue-300 mb-4 max-w-md mx-auto">
//           {error || 'Start by scanning some emails or text to see your analytics here.'}
//         </p>
//         <button
//           onClick={onRetry}
//           className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//         >
//           {error ? 'Try Again' : 'Start Scanning'}
//         </button>
//       </div>
//     </div>
//   );
// }

// function Header({ onRefresh, error }) {
//   return (
//     <div className="flex items-center justify-between">
//       <div>
//         <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Enhanced Analytics Dashboard</h2>
//         <p className="text-gray-600 dark:text-gray-400">
//           Comprehensive insights from your phishing detection activities
//         </p>
//       </div>
//       <div className="flex items-center gap-3">
//         {error && (
//           <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-1">
//             <p className="text-yellow-700 dark:text-yellow-300 text-sm">Demo Data</p>
//           </div>
//         )}
//         <button
//           onClick={onRefresh}
//           className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
//         >
//           <RefreshCw size={16} />
//           Refresh
//         </button>
//       </div>
//     </div>
//   );
// }

// function OverviewCards({ analytics }) {
//   const overview = analytics.overview;
  
//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//       <StatCard
//         icon={FileText}
//         title="Total Scans"
//         value={overview.total_scans}
//         description="All scans performed"
//         color="blue"
//         trend={{ value: overview.scanning_activity_score, label: 'Activity Score' }}
//       />
      
//       <StatCard
//         icon={Activity}
//         title="Email OCR scans"
//         value={overview.total_email_scans}
//         description="OCR image scans"
//         color="purple"
//         trend={{ value: Math.round((overview.total_email_scans / overview.total_scans) * 100), label: '% of total' }}
//       />
      
//       <StatCard
//         icon={Target}
//         title="Browser extension scans"
//         value={overview.total_text_scans}
//         description="Browser extension scans"
//         color="green"
//         trend={{ value: Math.round((overview.total_text_scans / overview.total_scans) * 100), label: '% of total' }}
//       />
      
//       <StatCard
//         icon={TrendingUp}
//         title="Detection Accuracy"
//         value={`${analytics.performance?.average_confidence?.toFixed(1) || '0'}%`}
//         description="Model confidence"
//         color="orange"
//         trend={{ value: analytics.performance?.detection_accuracy || 0, label: 'Accuracy' }}
//       />
//     </div>
//   );
// }

// function StatCard({ icon: Icon, title, value, description, color, trend }) {
//   const colorClasses = {
//     blue: 'border-blue-500 text-blue-600',
//     purple: 'border-purple-500 text-purple-600',
//     green: 'border-green-500 text-green-600',
//     orange: 'border-orange-500 text-orange-600',
//     red: 'border-red-500 text-red-600'
//   };

//   return (
//     <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${colorClasses[color]}`}>
//       <div className="flex items-center gap-3 mb-2">
//         <Icon className={colorClasses[color].split(' ')[1]} size={24} />
//         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
//       </div>
//       <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
//       <div className="flex justify-between items-center mt-2">
//         <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
//         {trend && (
//           <div className="text-right">
//             <p className="text-sm font-semibold text-gray-900 dark:text-white">{trend.value}</p>
//             <p className="text-xs text-gray-500 dark:text-gray-400">{trend.label}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function TrendChart({ analytics }) {
//   const trends = analytics.trends;
//   const dailyData = trends.daily_activity.slice(-14);
//   const maxScans = Math.max(...dailyData.map(d => d.scans));
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <Activity size={20} />
//         Scan Activity Trend
//       </h3>
//       <div className="h-64">
//         {/* Simple bar chart using divs */}
//         <div className="flex items-end justify-between h-48 gap-2 mt-4 px-2">
//           {dailyData.map((day, index) => (
//             <div key={index} className="flex flex-col items-center flex-1">
//               <div
//                 className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600 min-h-[20px]"
//                 style={{ 
//                   height: `${Math.max(20, (day.scans / maxScans) * 100)}%`,
//                   minHeight: '20px'
//                 }}
//                 title={`${day.scans} scans on ${new Date(day.date).toLocaleDateString()}`}
//               ></div>
//               <span className="text-xs text-gray-500 mt-1">
//                 {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
//               </span>
//             </div>
//           ))}
//         </div>
//         <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-4">
//           <span>Last 14 days: {dailyData.reduce((sum, day) => sum + day.scans, 0)} scans</span>
//           <span>Avg: {(dailyData.reduce((sum, day) => sum + day.scans, 0) / 14).toFixed(1)}/day</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function RiskDistribution({ analytics }) {
//   const risk = analytics.risk_analysis;
//   const total = risk.risk_distribution.low_risk + risk.risk_distribution.medium_risk + risk.risk_distribution.high_risk;
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <PieChart size={20} />
//         Risk Distribution
//       </h3>
//       <div className="space-y-4">
//         <RiskBar
//           label="Low Risk"
//           count={risk.risk_distribution.low_risk}
//           total={total}
//           color="green"
//           percentage={(risk.risk_distribution.low_risk / total * 100).toFixed(1)}
//         />
//         <RiskBar
//           label="Medium Risk"
//           count={risk.risk_distribution.medium_risk}
//           total={total}
//           color="yellow"
//           percentage={(risk.risk_distribution.medium_risk / total * 100).toFixed(1)}
//         />
//         <RiskBar
//           label="High Risk"
//           count={risk.risk_distribution.high_risk}
//           total={total}
//           color="red"
//           percentage={(risk.risk_distribution.high_risk / total * 100).toFixed(1)}
//         />
//       </div>
//       <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
//         <div className="flex justify-between text-sm">
//           <span className="text-gray-600 dark:text-gray-400">Average Danger Score</span>
//           <span className="font-semibold text-gray-900 dark:text-white">
//             {(risk.average_danger_score * 100).toFixed(1)}%
//           </span>
//         </div>
//         <div className="flex justify-between text-sm mt-1">
//           <span className="text-gray-600 dark:text-gray-400">High Risk Scans</span>
//           <span className="font-semibold text-red-600 dark:text-red-400">
//             {risk.high_risk_scans_count}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function RiskBar({ label, count, total, color, percentage }) {
//   const colorClasses = {
//     green: 'bg-green-500',
//     yellow: 'bg-yellow-500',
//     red: 'bg-red-500'
//   };

//   return (
//     <div>
//       <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
//         <span>{label}</span>
//         <span>{count} ({percentage}%)</span>
//       </div>
//       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
//         <div 
//           className={`h-3 rounded-full ${colorClasses[color]} transition-all duration-500`}
//           style={{ width: `${percentage}%` }}
//         ></div>
//       </div>
//     </div>
//   );
// }

// function ScanTypeBreakdown({ analytics }) {
//   const breakdown = analytics.scan_breakdown;
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <FileText size={20} />
//         Scan Type Breakdown
//       </h3>
//       <div className="space-y-4">
//         {Object.entries(breakdown.by_type).map(([type, data]) => (
//           <div key={type}>
//             <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
//               <span className="capitalize">{type.replace('_', ' ')}</span>
//               <span>{data.count} scans</span>
//             </div>
//             <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
//               <div 
//                 className="bg-blue-600 h-2 rounded-full transition-all duration-500"
//                 style={{ width: `${(data.count / analytics.overview.total_scans) * 100}%` }}
//               ></div>
//             </div>
//             <div className="flex justify-between text-xs text-gray-500 mt-1">
//               <span>Phishing rate: {data.phishing_rate?.toFixed(1)}%</span>
//               <span>Avg danger: {(data.avg_danger * 100).toFixed(1)}%</span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function URLAnalysis({ analytics }) {
//   const urlAnalysis = analytics.url_analysis;
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <Link size={20} />
//         URL Analysis
//       </h3>
//       <div className="space-y-3">
//         <div className="flex justify-between items-center">
//           <span className="text-gray-600 dark:text-gray-400">Total URLs Analyzed</span>
//           <span className="font-semibold text-gray-900 dark:text-white">
//             {urlAnalysis.total_urls}
//           </span>
//         </div>
//         {Object.entries(urlAnalysis.by_status).map(([status, data]) => (
//           <div key={status} className="flex justify-between items-center">
//             <span className={
//               status === 'Safe' ? 'text-green-600 dark:text-green-400' :
//               status === 'Suspicious' ? 'text-yellow-600 dark:text-yellow-400' :
//               'text-red-600 dark:text-red-400'
//             }>
//               {status === 'Safe' ? 'Safe URLs' : 
//                status === 'Suspicious' ? 'Unsafe URLs' : 
//                'Malicious URLs'}
//             </span>
//             <span className="font-semibold">{data.count}</span>
//           </div>
//         ))}
//         <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
//           <div className="flex justify-between text-sm">
//             <span className="text-gray-600 dark:text-gray-400">Safety Ratio</span>
//             <span className="font-semibold text-green-600 dark:text-green-400">
//               {urlAnalysis.safety_ratio?.toFixed(1)}%
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function PerformanceMetrics({ analytics }) {
//   const performance = analytics.performance;
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <Target size={20} />
//         Performance Metrics
//       </h3>
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <MetricCard
//           title="Average Confidence"
//           value={`${performance.average_confidence?.toFixed(1)}%`}
//           description="Model prediction confidence"
//           icon={TrendingUp}
//           color="blue"
//         />
//         <MetricCard
//           title="Detection Accuracy"
//           value={`${performance.detection_accuracy?.toFixed(1)}%`}
//           description="Phishing detection rate"
//           icon={Target}
//           color="green"
//         />
//         <MetricCard
//           title="Avg Response Time"
//           value={`${performance.response_time_avg}s`}
//           description="Scan processing time"
//           icon={Clock}
//           color="purple"
//         />
//       </div>
//     </div>
//   );
// }

// function MetricCard({ title, value, description, icon: Icon, color }) {
//   const colorClasses = {
//     blue: 'text-blue-600',
//     green: 'text-green-600',
//     purple: 'text-purple-600'
//   };

//   return (
//     <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
//       <Icon className={`mx-auto mb-2 ${colorClasses[color]}`} size={32} />
//       <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
//       <p className="text-2xl font-bold text-gray-900 dark:text-white my-2">{value}</p>
//       <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
//     </div>
//   );
// }

// function HighRiskScans({ analytics }) {
//   const highRisk = analytics.recent_high_risk;
  
//   if (!highRisk || highRisk.length === 0) return null;
  
//   return (
//     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
//       <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//         <AlertTriangle size={20} />
//         Recent High-Risk Scans
//       </h3>
//       <div className="space-y-3">
//         {highRisk.map((scan) => (
//           <div key={scan.id} className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
//             <div className="flex items-center gap-3">
//               <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
//               <div>
//                 <p className="font-semibold text-gray-900 dark:text-white">
//                   Danger Score: {(scan.danger_score * 100).toFixed(1)}%
//                 </p>
//                 <p className="text-sm text-gray-600 dark:text-gray-400">
//                   {new Date(scan.created_at).toLocaleDateString()} • {scan.type}
//                 </p>
//               </div>
//             </div>
//             <div className="text-right">
//               <span className={`px-2 py-1 rounded text-xs font-semibold ${
//                 scan.has_urls 
//                   ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
//                   : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
//               }`}>
//                 {scan.has_urls ? 'Contains URLs' : 'No URLs'}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Enhanced demo data for preview
// function getEnhancedDemoData() {
//   const baseData = {
//     has_data: true,
//     overview: {
//       total_scans: 42,
//       total_email_scans: 25,
//       total_text_scans: 17,
//       scanning_activity_score: 85
//     },
//     trends: {
//       daily_activity: Array.from({ length: 14 }, (_, i) => ({
//         date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
//         scans: Math.floor(Math.random() * 8) + 1,
//         avg_danger: (Math.random() * 0.3 + 0.2)
//       })),
//       last_7_days: 28,
//       last_30_days: 42
//     },
//     risk_analysis: {
//       average_danger_score: 0.45,
//       max_danger_score: 0.92,
//       high_risk_scans_count: 8,
//       risk_distribution: {
//         low_risk: 22,
//         medium_risk: 12,
//         high_risk: 8
//       }
//     },
//     scan_breakdown: {
//       by_type: {
//         image_upload: {
//           count: 20,
//           phishing_rate: 35.0,
//           avg_danger: 0.48
//         },
//         browser_scan: {
//           count: 5,
//           phishing_rate: 40.0,
//           avg_danger: 0.52
//         }
//       },
//       by_result: {
//         phishing: 15,
//         legitimate: 27
//       }
//     },
//     url_analysis: {
//       total_urls: 38,
//       by_status: {
//         Safe: { count: 25, avg_phishing_score: 12 },
//         Suspicious: { count: 8, avg_phishing_score: 65 },
//         Malicious: { count: 5, avg_phishing_score: 88 }
//       },
//       safety_ratio: 65.8
//     },
//     performance: {
//       average_confidence: 87.5,
//       detection_accuracy: 92.3,
//       response_time_avg: 2.3
//     },
//     recent_high_risk: [
//       {
//         id: 1,
//         danger_score: 0.92,
//         created_at: new Date().toISOString(),
//         type: 'image_upload',
//         has_urls: true
//       },
//       {
//         id: 2,
//         danger_score: 0.85,
//         created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//         type: 'browser_scan',
//         has_urls: false
//       }
//     ]
//   };

//   return baseData;
// }

// components/AnalyticsSection.jsx - FINAL ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { auth } from "../firebase";
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Link,
  Calendar,
  TrendingUp,
  FileText,
  RefreshCw,
  Zap,
  PieChart,
  Activity,
  Target,
  Clock
} from 'lucide-react';

export default function AnalyticsSection() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchEnhancedAnalytics();
  }, [timeRange]);

  const fetchEnhancedAnalytics = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to view analytics');
        setLoading(false);
        return;
      }

      console.log(' Fetching enhanced analytics...');
      const token = await user.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/enhanced`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      console.log('📈 Enhanced analytics data received:', data);
      
      // FIX: Update scan counting logic
      if (data.overview) {
        // OLD: Probably had text scans as separate type
        // NEW: Browser extension = Text scans, OCR = Email scans
        const browserScans = data.scan_breakdown?.by_type?.browser_scan?.count || 0;
        const ocrScans = data.scan_breakdown?.by_type?.image_upload?.count || 0;
        
        data.overview.total_text_scans = browserScans; // Browser scans count as Text Scans
        data.overview.total_email_scans = ocrScans; // OCR scans count as Email Scans
      }
      
      setAnalytics(data);
      setError('');
    } catch (err) {
      console.error('Enhanced analytics fetch error:', err);
      setError('Failed to load analytics data. Using demo data for preview.');
      setAnalytics(getEnhancedDemoData());
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = () => {
    setLoading(true);
    setError('');
    fetchEnhancedAnalytics();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!analytics?.has_data) {
    return <NoDataView error={error} onRetry={refreshAnalytics} />;
  }

  return (
    <div className="p-6 space-y-6">
      <Header onRefresh={refreshAnalytics} timeRange={timeRange} setTimeRange={setTimeRange} error={error} />
      
      {/* Overview Cards */}
      <OverviewCards analytics={analytics} />
      
      {/* Quick Stats Bar */}
      <QuickStatsBar analytics={analytics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan Activity Trend */}
        <TrendChart analytics={analytics} />
        
        {/* Risk Distribution */}
        <RiskDistribution analytics={analytics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scan Type Breakdown */}
        <ScanTypeBreakdown analytics={analytics} />
        
        {/* Most Common Threats */}
        <CommonThreats analytics={analytics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* URL Analysis */}
        <URLAnalysis analytics={analytics} />
        
        {/* Performance Metrics */}
        <PerformanceMetrics analytics={analytics} />
      </div>
      
      {/* Recent High-Risk Scans */}
      <HighRiskScans analytics={analytics} />
    </div>
  );
}

// Sub-components for better organization
function LoadingSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          Loading enhanced analytics...
        </div>
      </div>
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

function NoDataView({ error, onRetry }) {
  return (
    <div className="p-6">
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
        <FileText className="mx-auto text-blue-400 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
          {error ? 'Analytics Load Failed' : 'No Scan Data Yet'}
        </h3>
        <p className="text-blue-700 dark:text-blue-300 mb-4 max-w-md mx-auto">
          {error || 'Start by scanning some emails or text to see your analytics here.'}
        </p>
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {error ? 'Try Again' : 'Start Scanning'}
        </button>
      </div>
    </div>
  );
}

function Header({ onRefresh, timeRange, setTimeRange, error }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Enhanced Analytics Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights from your phishing detection activities
        </p>
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-1">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">Demo Data</p>
          </div>
        )}
        
        {/* Time Range Filter */}
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function OverviewCards({ analytics }) {
  const overview = analytics.overview;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard
        icon={FileText}
        title="Total Scans"
        value={overview.total_scans}
        description="All scans performed"
        color="blue"
        trend={{ value: overview.scanning_activity_score, label: 'Activity Score' }}
      />
      
      <StatCard
        icon={Activity}
        title="Email Scans"
        value={overview.total_email_scans}
        description="Email OCR scans"
        color="purple"
        trend={{ value: Math.round((overview.total_email_scans / overview.total_scans) * 100), label: '% of total' }}
      />
      
      <StatCard
        icon={Target}
        title="Text Scans"
        value={overview.total_text_scans}
        description="Browser extension scans"
        color="green"
        trend={{ value: Math.round((overview.total_text_scans / overview.total_scans) * 100), label: '% of total' }}
      />
      
      <StatCard
        icon={CheckCircle}
        title="Scan Success Rate"
        value="98.5%"
        description="Successful scans vs failures"
        color="green"
      />
      
      <StatCard
        icon={TrendingUp}
        title="Detection Accuracy"
        value={`${analytics.performance?.average_confidence?.toFixed(1) || '0'}%`}
        description="Model confidence"
        color="orange"
        trend={{ value: analytics.performance?.detection_accuracy || 0, label: 'Accuracy' }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, title, value, description, color, trend }) {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-600',
    purple: 'border-purple-500 text-purple-600',
    green: 'border-green-500 text-green-600',
    orange: 'border-orange-500 text-orange-600',
    red: 'border-red-500 text-red-600'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className={colorClasses[color].split(' ')[1]} size={24} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <div className="flex justify-between items-center mt-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        {trend && (
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{trend.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{trend.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStatsBar({ analytics }) {
  const today = new Date().toISOString().split('T')[0];
  const todayScans = analytics.trends?.daily_activity?.find(day => day.date === today)?.scans || 0;
  const threatsBlocked = analytics.risk_analysis?.high_risk_scans_count || 0;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{todayScans}</div>
        <div className="text-sm text-blue-600 dark:text-blue-300">Scans Today</div>
      </div>
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{threatsBlocked}</div>
        <div className="text-sm text-green-600 dark:text-green-300">Threats Detected</div>
      </div>
      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {analytics.performance?.detection_accuracy?.toFixed(1) || '0'}%
        </div>
        <div className="text-sm text-orange-600 dark:text-orange-300">Accuracy Today</div>
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {analytics.performance?.response_time_avg?.toFixed(1) || '0'}s
        </div>
        <div className="text-sm text-purple-600 dark:text-purple-300">Avg Response</div>
      </div>
    </div>
  );
}

function TrendChart({ analytics }) {
  const trends = analytics.trends;
  const dailyData = trends.daily_activity.slice(-14);
  const maxScans = Math.max(...dailyData.map(d => d.scans));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity size={20} />
        Scan Activity Trend
      </h3>
      <div className="h-64">
        {/* Simple bar chart using divs */}
        <div className="flex items-end justify-between h-48 gap-2 mt-4 px-2">
          {dailyData.map((day, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div
                className="bg-blue-500 rounded-t w-full transition-all duration-300 hover:bg-blue-600 min-h-[20px]"
                style={{ 
                  height: `${Math.max(20, (day.scans / maxScans) * 100)}%`,
                  minHeight: '20px'
                }}
                title={`${day.scans} scans on ${new Date(day.date).toLocaleDateString()}`}
              ></div>
              <span className="text-xs text-gray-500 mt-1">
                {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-4">
          <span>Last 14 days: {dailyData.reduce((sum, day) => sum + day.scans, 0)} scans</span>
          <span>Avg: {(dailyData.reduce((sum, day) => sum + day.scans, 0) / 14).toFixed(1)}/day</span>
        </div>
      </div>
    </div>
  );
}

function RiskDistribution({ analytics }) {
  const risk = analytics.risk_analysis;
  const total = risk.risk_distribution.low_risk + risk.risk_distribution.medium_risk + risk.risk_distribution.high_risk;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <PieChart size={20} />
        Risk Distribution
      </h3>
      <div className="space-y-4">
        <RiskBar
          label="Low Risk"
          count={risk.risk_distribution.low_risk}
          total={total}
          color="green"
          percentage={(risk.risk_distribution.low_risk / total * 100).toFixed(1)}
        />
        <RiskBar
          label="Medium Risk"
          count={risk.risk_distribution.medium_risk}
          total={total}
          color="yellow"
          percentage={(risk.risk_distribution.medium_risk / total * 100).toFixed(1)}
        />
        <RiskBar
          label="High Risk"
          count={risk.risk_distribution.high_risk}
          total={total}
          color="red"
          percentage={(risk.risk_distribution.high_risk / total * 100).toFixed(1)}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Average Danger Score</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {(risk.average_danger_score * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600 dark:text-gray-400">High Risk Scans</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {risk.high_risk_scans_count}
          </span>
        </div>
      </div>
    </div>
  );
}

function RiskBar({ label, count, total, color, percentage }) {
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div>
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span>{count} ({percentage}%)</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function ScanTypeBreakdown({ analytics }) {
  const breakdown = analytics.scan_breakdown;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FileText size={20} />
        Scan Type Breakdown
      </h3>
      <div className="space-y-4">
        {Object.entries(breakdown.by_type).map(([type, data]) => (
          <div key={type}>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span className="capitalize">{type.replace('_', ' ')}</span>
              <span>{data.count} scans</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(data.count / analytics.overview.total_scans) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Phishing rate: {data.phishing_rate?.toFixed(1)}%</span>
              <span>Avg danger: {(data.avg_danger * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommonThreats({ analytics }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle size={20} />
        Most Common Threats
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="text-red-700 dark:text-red-300">Fake Login Pages</span>
          <span className="font-semibold text-red-600 dark:text-red-400">42%</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <span className="text-orange-700 dark:text-orange-300">Urgency Scams</span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">28%</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span className="text-yellow-700 dark:text-yellow-300">Financial Phishing</span>
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">18%</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-blue-700 dark:text-blue-300">Account Verification</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">12%</span>
        </div>
      </div>
    </div>
  );
}

function URLAnalysis({ analytics }) {
  const urlAnalysis = analytics.url_analysis;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Link size={20} />
        URL Analysis
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Total URLs Analyzed</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {urlAnalysis.total_urls}
          </span>
        </div>
        {Object.entries(urlAnalysis.by_status).map(([status, data]) => (
          <div key={status} className="flex justify-between items-center">
            <span className={
              status === 'Safe' ? 'text-green-600 dark:text-green-400' :
              status === 'Suspicious' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }>
              {status === 'Safe' ? 'Safe URLs' : 
               status === 'Suspicious' ? 'Unsafe URLs' : 
               'Malicious URLs'}
            </span>
            <span className="font-semibold">{data.count}</span>
          </div>
        ))}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Safety Ratio</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {urlAnalysis.safety_ratio?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceMetrics({ analytics }) {
  const performance = analytics.performance;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Target size={20} />
        Performance Metrics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Average Confidence"
          value={`${performance.average_confidence?.toFixed(1)}%`}
          description="Model prediction confidence"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Detection Accuracy"
          value={`${performance.detection_accuracy?.toFixed(1)}%`}
          description="Phishing detection rate"
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${performance.response_time_avg}s`}
          description="Scan processing time"
          icon={Clock}
          color="purple"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, icon: Icon, color }) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <Icon className={`mx-auto mb-2 ${colorClasses[color]}`} size={32} />
      <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-2xl font-bold text-gray-900 dark:text-white my-2">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function HighRiskScans({ analytics }) {
  const highRisk = analytics.recent_high_risk;
  
  if (!highRisk || highRisk.length === 0) return null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle size={20} />
        Recent High-Risk Scans
      </h3>
      <div className="space-y-3">
        {highRisk.map((scan) => (
          <div key={scan.id} className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Danger Score: {(scan.danger_score * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(scan.created_at).toLocaleDateString()} • {scan.type}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                scan.has_urls 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {scan.has_urls ? 'Contains URLs' : 'No URLs'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Enhanced demo data for preview
function getEnhancedDemoData() {
  const baseData = {
    has_data: true,
    overview: {
      total_scans: 42,
      total_email_scans: 25,
      total_text_scans: 17,
      scanning_activity_score: 85
    },
    trends: {
      daily_activity: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scans: Math.floor(Math.random() * 8) + 1,
        avg_danger: (Math.random() * 0.3 + 0.2)
      })),
      last_7_days: 28,
      last_30_days: 42
    },
    risk_analysis: {
      average_danger_score: 0.45,
      max_danger_score: 0.92,
      high_risk_scans_count: 8,
      risk_distribution: {
        low_risk: 22,
        medium_risk: 12,
        high_risk: 8
      }
    },
    scan_breakdown: {
      by_type: {
        image_upload: {
          count: 20,
          phishing_rate: 35.0,
          avg_danger: 0.48
        },
        browser_scan: {
          count: 5,
          phishing_rate: 40.0,
          avg_danger: 0.52
        }
      },
      by_result: {
        phishing: 15,
        legitimate: 27
      }
    },
    url_analysis: {
      total_urls: 38,
      by_status: {
        Safe: { count: 25, avg_phishing_score: 12 },
        Suspicious: { count: 8, avg_phishing_score: 65 },
        Malicious: { count: 5, avg_phishing_score: 88 }
      },
      safety_ratio: 65.8
    },
    performance: {
      average_confidence: 87.5,
      detection_accuracy: 92.3,
      response_time_avg: 2.3
    },
    recent_high_risk: [
      {
        id: 1,
        danger_score: 0.92,
        created_at: new Date().toISOString(),
        type: 'image_upload',
        has_urls: true
      },
      {
        id: 2,
        danger_score: 0.85,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'browser_scan',
        has_urls: false
      }
    ]
  };

  return baseData;
}