import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader, BarChart3, History } from 'lucide-react';
import { auth } from "../firebase";

export default function ExportSection() {
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  const exportCSV = async () => {
    setExporting('csv');
    setError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to export data');
        return;
      }

      const token = await user.getIdToken();
      
      // Fetch comprehensive data from both history and analytics - USE CORRECT ENDPOINTS
      const [historyRes, analyticsRes, enhancedAnalyticsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ocr/scans/history?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // Use /api/analytics/quick instead of /api/analytics
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/quick`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/enhanced`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check if all responses are ok
      if (!historyRes.ok) {
        throw new Error('Failed to fetch scan history');
      }
      if (!analyticsRes.ok) {
        console.warn('Quick analytics endpoint not available, using fallback data');
      }
      if (!enhancedAnalyticsRes.ok) {
        console.warn('Enhanced analytics endpoint not available, using fallback data');
      }

      const historyData = await historyRes.json();
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : getFallbackAnalytics();
      const enhancedData = enhancedAnalyticsRes.ok ? await enhancedAnalyticsRes.json() : null;

      // Create comprehensive CSV with multiple sheets (multiple files)
      await downloadComprehensiveCSV(historyData, analyticsData, enhancedData);
      
    } catch (err) {
      setError('Failed to export CSV: ' + err.message);
      console.error('Export error:', err);
    } finally {
      setExporting('');
    }
  };

  // Fallback analytics data in case endpoints fail
  const getFallbackAnalytics = () => {
    return {
      overview: {
        total_scans: 0,
        total_phishing: 0,
        total_legitimate: 0,
        phishing_percentage: 0,
        legitimate_percentage: 0,
        detection_accuracy: 0
      },
      scan_breakdown: {
        by_type: {
          email_scans: 0,
          text_scans: 0
        }
      },
      performance: {
        average_confidence: 0,
        detection_rate: 0
      }
    };
  };

  const downloadComprehensiveCSV = async (historyData, analyticsData, enhancedData) => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // 1. Scan History CSV
    if (historyData.scans && historyData.scans.length > 0) {
      const scanHistoryCSV = convertScanHistoryToCSV(historyData.scans);
      downloadFile(scanHistoryCSV, `phishnet-scan-history-${timestamp}.csv`, 'text/csv');
    } else {
      // Create empty scan history CSV if no data
      const emptyScanCSV = 'Scan ID,Date,Time,Scan Type,Result,Danger Score,Model Confidence,URLs Found,Emails Found\nNo scan data available';
      downloadFile(emptyScanCSV, `phishnet-scan-history-${timestamp}.csv`, 'text/csv');
    }

    // 2. Analytics Summary CSV
    const analyticsCSV = convertAnalyticsToCSV(analyticsData, enhancedData);
    downloadFile(analyticsCSV, `phishnet-analytics-${timestamp}.csv`, 'text/csv');

    // 3. Risk Analysis CSV (only if enhanced data available)
    if (enhancedData?.risk_analysis) {
      const riskCSV = convertRiskAnalysisToCSV(enhancedData);
      downloadFile(riskCSV, `phishnet-risk-analysis-${timestamp}.csv`, 'text/csv');
    }

    // 4. URL Analysis CSV (only if enhanced data available)
    if (enhancedData?.url_analysis) {
      const urlCSV = convertURLAnalysisToCSV(enhancedData);
      downloadFile(urlCSV, `phishnet-url-analysis-${timestamp}.csv`, 'text/csv');
    }
  };

  const convertScanHistoryToCSV = (scans) => {
    const headers = [
      'Scan ID', 'Date', 'Time', 'Scan Type', 'Result', 'Danger Score', 
      'Model Confidence', 'Extracted Text Preview',
      'URLs Found', 'Emails Found', 'Risk Factors Count', 'Created At'
    ];
    
    const rows = scans.map(scan => [
      scan.id || 'N/A',
      new Date(scan.created_at).toLocaleDateString(),
      new Date(scan.created_at).toLocaleTimeString(),
      scan.scanType || 'OCR Email Scan',
      scan.is_phishing ? 'PHISHING' : 'LEGITIMATE',
      (scan.danger_score * 100).toFixed(1) + '%',
      (scan.model_confidence * 100).toFixed(1) + '%',
      `"${(scan.extracted_text || '').substring(0, 100).replace(/"/g, '""')}"`,
      scan.urls_found ? scan.urls_found.length : 0,
      scan.emails_found ? scan.emails_found.length : 0,
      scan.risk_factors ? scan.risk_factors.length : 0,
      new Date(scan.created_at).toISOString()
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const convertAnalyticsToCSV = (analytics, enhancedData) => {
    const headers = ['Metric', 'Value', 'Percentage', 'Description'];
    
    const rows = [
      ['Total Scans', analytics.overview?.total_scans || 0, '100%', 'All scans performed'],
      ['Phishing Detected', analytics.overview?.total_phishing || 0, `${analytics.overview?.phishing_percentage || 0}%`, 'Scans flagged as phishing'],
      ['Legitimate Emails', analytics.overview?.total_legitimate || 0, `${analytics.overview?.legitimate_percentage || 0}%`, 'Scans identified as legitimate'],
      ['Email Scans', analytics.scan_types?.email_scans || analytics.scan_breakdown?.by_type?.email_scans || 0, 
        `${((analytics.scan_types?.email_scans || analytics.scan_breakdown?.by_type?.email_scans || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%`, 
        'OCR image scans'],
      ['Text Scans', analytics.scan_types?.text_scans || analytics.scan_breakdown?.by_type?.text_scans || 0, 
        `${((analytics.scan_types?.text_scans || analytics.scan_breakdown?.by_type?.text_scans || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%`, 
        'Direct text analysis'],
      ['Detection Accuracy', '-', `${analytics.overview?.detection_accuracy || 0}%`, 'Model detection accuracy'],
      ['Average Confidence', '-', `${analytics.performance?.average_confidence || analytics.overview?.detection_accuracy || 0}%`, 'Average model confidence score'],
    ];

    // Add high risk scans if available from enhanced data
    if (enhancedData?.risk_analysis) {
      rows.push([
        'High Risk Scans', 
        enhancedData.risk_analysis.high_risk_scans_count || 0, 
        `${((enhancedData.risk_analysis.high_risk_scans_count || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%`, 
        'Scans with danger score > 70%'
      ]);
    }

    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const convertRiskAnalysisToCSV = (enhancedData) => {
    const headers = ['Risk Level', 'Scan Count', 'Percentage', 'Average Danger Score', 'Description'];
    const risk = enhancedData.risk_analysis;
    const total = (risk.risk_distribution?.low_risk || 0) + (risk.risk_distribution?.medium_risk || 0) + (risk.risk_distribution?.high_risk || 0);
    
    const rows = [
      ['Low Risk', risk.risk_distribution?.low_risk || 0, `${((risk.risk_distribution?.low_risk || 0) / total * 100).toFixed(1)}%`, '< 30%', 'Minimal threat indicators'],
      ['Medium Risk', risk.risk_distribution?.medium_risk || 0, `${((risk.risk_distribution?.medium_risk || 0) / total * 100).toFixed(1)}%`, '30-70%', 'Moderate threat indicators'],
      ['High Risk', risk.risk_distribution?.high_risk || 0, `${((risk.risk_distribution?.high_risk || 0) / total * 100).toFixed(1)}%`, '> 70%', 'Strong threat indicators'],
      ['Overall Average', total, '100%', `${((risk.average_danger_score || 0) * 100).toFixed(1)}%`, 'Average across all scans'],
    ];

    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const convertURLAnalysisToCSV = (enhancedData) => {
    const headers = ['URL Status', 'Count', 'Percentage', 'Average Phishing Score', 'Safety Impact'];
    const urlAnalysis = enhancedData.url_analysis;
    const total = urlAnalysis.total_urls || 0;
    
    let rows = [];
    
    if (urlAnalysis.by_status) {
      rows = Object.entries(urlAnalysis.by_status).map(([status, data]) => [
        status,
        data.count || 0,
        `${((data.count || 0) / total * 100).toFixed(1)}%`,
        `${(data.avg_phishing_score?.toFixed(1) || 0)}%`,
        status === 'Safe' ? 'No Impact' : status === 'Suspicious' ? 'Monitor' : 'High Risk'
      ]);
    }

    // Add summary row
    rows.push([
      'TOTAL',
      total,
      '100%',
      '-',
      `Overall Safety: ${(urlAnalysis.safety_ratio?.toFixed(1) || 0)}%`
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    setExporting('pdf');
    setError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to export data');
        return;
      }

      const token = await user.getIdToken();
      
      // Fetch comprehensive data for PDF report - USE CORRECT ENDPOINTS
      const [analyticsRes, enhancedRes, historyRes] = await Promise.all([
        // Use quick analytics instead of basic analytics
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/quick`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/analytics/enhanced`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ocr/scans/history?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Handle responses with fallbacks
      if (!historyRes.ok) {
        throw new Error('Failed to fetch scan history');
      }

      const analytics = analyticsRes.ok ? await analyticsRes.json() : getFallbackAnalytics();
      const enhanced = enhancedRes.ok ? await enhancedRes.json() : null;
      const history = await historyRes.json();

      // Create comprehensive PDF report
      createComprehensivePDF(analytics, enhanced, history, user);
      
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message);
      console.error('PDF export error:', err);
    } finally {
      setExporting('');
    }
  };

  const createComprehensivePDF = (analytics, enhanced, history, user) => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PhishNet Comprehensive Security Report</title>
        <style>
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #4f46e5; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(2, 1fr); 
            gap: 20px; 
            margin: 25px 0; 
          }
          .stat-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #4f46e5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .section { 
            margin: 30px 0; 
            page-break-inside: avoid;
          }
          .section-title { 
            color: #4f46e5; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          .risk-metrics { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 15px; 
            margin: 20px 0; 
          }
          .risk-card { 
            text-align: center; 
            padding: 15px; 
            border-radius: 8px; 
          }
          .low-risk { background: #dcfce7; border: 1px solid #16a34a; }
          .medium-risk { background: #fef9c3; border: 1px solid #d97706; }
          .high-risk { background: #fee2e2; border: 1px solid #dc2626; }
          .scans-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 14px;
          }
          .scans-table th, .scans-table td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          .scans-table th { 
            background-color: #4f46e5; 
            color: white; 
          }
          .phishing { color: #dc2626; font-weight: bold; }
          .legitimate { color: #16a34a; font-weight: bold; }
          @media print { 
            body { margin: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #4f46e5; margin-bottom: 10px;">PhishNet Security Report</h1>
          <h2 style="color: #6b7280; margin-bottom: 15px;">Comprehensive Analysis & Threat Intelligence</h2>
          <p><strong>Generated:</strong> ${currentDate} | <strong>User:</strong> ${user.email}</p>
        </div>
        
        <!-- Executive Summary -->
        <div class="section">
          <h2 class="section-title"> Executive Summary</h2>
          <div class="summary-grid">
            <div class="stat-card">
              <h3>Total Security Scans</h3>
              <p style="font-size: 28px; font-weight: bold; color: #4f46e5; margin: 10px 0;">
                ${analytics.overview?.total_scans || 0}
              </p>
              <p style="color: #6b7280;">Complete scan history</p>
            </div>
            <div class="stat-card">
              <h3>Threat Detection Rate</h3>
              <p style="font-size: 28px; font-weight: bold; color: #dc2626; margin: 10px 0;">
                ${analytics.overview?.phishing_percentage || 0}%
              </p>
              <p style="color: #6b7280;">${analytics.overview?.total_phishing || 0} phishing attempts blocked</p>
            </div>
            <div class="stat-card">
              <h3>System Accuracy</h3>
              <p style="font-size: 28px; font-weight: bold; color: #16a34a; margin: 10px 0;">
                ${analytics.overview?.detection_accuracy || 0}%
              </p>
              <p style="color: #6b7280;">Detection confidence score</p>
            </div>
            <div class="stat-card">
              <h3>Average Risk Score</h3>
              <p style="font-size: 28px; font-weight: bold; color: #d97706; margin: 10px 0;">
                ${((enhanced?.risk_analysis?.average_danger_score || 0) * 100).toFixed(1)}%
              </p>
              <p style="color: #6b7280;">Overall threat level</p>
            </div>
          </div>
        </div>

        <!-- Risk Analysis -->
        ${enhanced?.risk_analysis ? `
        <div class="section">
          <h2 class="section-title">🛡️ Risk Analysis</h2>
          <div class="risk-metrics">
            <div class="risk-card low-risk">
              <h4>Low Risk</h4>
              <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 10px 0;">
                ${enhanced.risk_analysis.risk_distribution?.low_risk || 0}
              </p>
              <p>${((enhanced.risk_analysis.risk_distribution?.low_risk || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%</p>
            </div>
            <div class="risk-card medium-risk">
              <h4>Medium Risk</h4>
              <p style="font-size: 24px; font-weight: bold; color: #d97706; margin: 10px 0;">
                ${enhanced.risk_analysis.risk_distribution?.medium_risk || 0}
              </p>
              <p>${((enhanced.risk_analysis.risk_distribution?.medium_risk || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%</p>
            </div>
            <div class="risk-card high-risk">
              <h4>High Risk</h4>
              <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0;">
                ${enhanced.risk_analysis.risk_distribution?.high_risk || 0}
              </p>
              <p>${((enhanced.risk_analysis.risk_distribution?.high_risk || 0) / (analytics.overview?.total_scans || 1) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- URL Analysis -->
        ${enhanced?.url_analysis ? `
        <div class="section">
          <h2 class="section-title"> URL Security Analysis</h2>
          <div class="summary-grid">
            <div class="stat-card">
              <h3>Total URLs Analyzed</h3>
              <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">
                ${enhanced.url_analysis.total_urls || 0}
              </p>
            </div>
            <div class="stat-card">
              <h3>Safety Ratio</h3>
              <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 10px 0;">
                ${enhanced.url_analysis.safety_ratio?.toFixed(1) || 0}%
              </p>
              <p>Safe URLs detected</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Recent Scan Activity -->
        <div class="section">
          <h2 class="section-title"> Recent Scan Activity</h2>
          <table class="scans-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Result</th>
                <th>Danger Score</th>
                <th>Confidence</th>
                <th>URLs</th>
                <th>Emails</th>
              </tr>
            </thead>
            <tbody>
              ${history.scans ? history.scans.map(scan => `
                <tr>
                  <td>${new Date(scan.created_at).toLocaleDateString()}</td>
                  <td>${scan.scanType || 'OCR Scan'}</td>
                  <td class="${scan.is_phishing ? 'phishing' : 'legitimate'}">
                    ${scan.is_phishing ? '🔴 PHISHING' : '🟢 LEGITIMATE'}
                  </td>
                  <td>${(scan.danger_score * 100).toFixed(1)}%</td>
                  <td>${(scan.model_confidence * 100).toFixed(1)}%</td>
                  <td>${scan.urls_found ? scan.urls_found.length : 0}</td>
                  <td>${scan.emails_found ? scan.emails_found.length : 0}</td>
                </tr>
              `).join('') : '<tr><td colspan="7">No scans found</td></tr>'}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
          <p><strong>Generated by PhishNet AI Security Platform</strong></p>
          <p>Advanced phishing detection and threat intelligence system</p>
          <p style="font-size: 12px; margin-top: 10px;">Report ID: ${Date.now()} | Confidential Security Document</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Export Reports</h2>
      <p className="text-gray-700 dark:text-gray-300 mb-6">
        Download comprehensive scan history and analytics for offline analysis, reporting, and compliance documentation.
      </p>
      
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="text-green-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comprehensive CSV Export</h3>
              <p className="text-sm text-green-600 font-medium">Multiple files included</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Download complete dataset in CSV format. Includes scan history, analytics, risk analysis, and URL security data. Perfect for data analysis and machine learning.
          </p>
          <button
            onClick={exportCSV}
            disabled={exporting === 'csv'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {exporting === 'csv' ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            {exporting === 'csv' ? 'Exporting...' : 'Export Comprehensive CSV'}
          </button>
        </div>

        {/* PDF Export Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Professional PDF Report</h3>
              <p className="text-sm text-blue-600 font-medium">Executive summary</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Generate a comprehensive security report with executive summary, risk analysis, and recent scans. Ready for management presentations and compliance documentation.
          </p>
          <button
            onClick={exportPDF}
            disabled={exporting === 'pdf'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {exporting === 'pdf' ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <FileText size={18} />
            )}
            {exporting === 'pdf' ? 'Generating...' : 'Export PDF Report'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-purple-200 dark:border-gray-600">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Export Includes Comprehensive Data:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <History size={16} />
              Scan History
            </h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Complete scan timeline with timestamps</li>
              <li>• Phishing detection results and confidence</li>
              <li>• Danger scores and risk assessments</li>
              <li>• Extracted URLs and email addresses</li>
              <li>• Risk factors and suspicious patterns</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
              <BarChart3 size={16} />
              Analytics & Metrics
            </h5>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Security overview and threat detection rates</li>
              <li>• Risk distribution analysis</li>
              <li>• URL safety analysis and statistics</li>
              <li>• Performance metrics and accuracy scores</li>
              <li>• Executive summary for reporting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}