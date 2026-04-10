// components/HistorySection.jsx - FINAL VERSION WITH COMPLETE URL ANALYSIS
import React, { useState, useEffect } from 'react';
import { auth } from "../firebase";

export default function HistorySection() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedScan, setSelectedScan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const scanTypeConfig = {
    image_upload: {
      icon: '',
      label: 'OCR Email Scan',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200'
    },
    browser_scan: {
      icon: '',
      label: 'Browser Extension',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-200'
    }
  };

  const getScanTypeDisplay = (source) => {
    return scanTypeConfig[source] || scanTypeConfig.image_upload;
  };

  useEffect(() => {
    fetchScanHistory();
  }, []);

  const fetchScanHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to view scan history');
        setLoading(false);
        return;
      }

      console.log('Fetching scan history...');
      const token = await user.getIdToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const ocrResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/ocr/scans/history`,
        { headers }
      );

      let allScans = [];
      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();
        allScans = (ocrData.scans || []).map(scan => ({
          ...scan,
          id: scan.id || `scan-${scan.scan_id}`,
          scan_source: scan.scan_source || 'image_upload',
          displayText: scan.extracted_text?.substring(0, 100) + '...' || 'No text',
          result: scan.is_phishing ? 'Phishing' : 'Legitimate',
          danger_score: scan.danger_score || 0,
          date: scan.created_at,
          imageUrl: null,
          hasImage: scan.has_image,
          image_filename: scan.image_filename,
          extracted_text: scan.extracted_text,
          risk_factors: scan.risk_factors || [],
          suspicious_patterns: scan.suspicious_patterns || [],
          model_confidence: scan.model_confidence,
          ocr_confidence: scan.ocr_confidence,
          explanation: scan.explanation,
          url_statistics: scan.url_statistics,
          urls_found: scan.urls_found,
          url_analysis: scan.url_analysis
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Fetched scans:', allScans.length);
      }

      setScans(allScans);
      if (allScans.length === 0) {
        setError('No scan history found. Perform some scans first.');
      }
    } catch (err) {
      console.error('History error:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const openScanDetails = async (scan) => {
    setSelectedScan(scan);
    setModalOpen(true);
    setImageLoading(true);
    setImageError(false);

    if (scan.hasImage) {
      try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/ocr/scans/${scan.id}/image`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const blob = await response.blob();
          const imageObjectURL = URL.createObjectURL(blob);
          setSelectedScan(prev => ({ ...prev, imageUrl: imageObjectURL }));
          setImageLoading(false);
        } else {
          setImageError(true);
          setImageLoading(false);
        }
      } catch (err) {
        setImageError(true);
        setImageLoading(false);
      }
    } else {
      setImageLoading(false);
    }
  };

  const closeModal = () => {
    if (selectedScan?.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedScan.imageUrl);
    }
    setModalOpen(false);
    setSelectedScan(null);
    setImageLoading(false);
    setImageError(false);
  };

  const filterScansByDate = (scans, dateFilter) => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return scans.filter(scan => new Date(scan.date) >= today);
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return scans.filter(scan => new Date(scan.date) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return scans.filter(scan => new Date(scan.date) >= monthAgo);
      case '3months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return scans.filter(scan => new Date(scan.date) >= threeMonthsAgo);
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return scans.filter(scan => new Date(scan.date) >= yearAgo);
      default:
        return scans;
    }
  };

  const filteredScans = filterScansByDate(scans, dateFilter).filter(scan => {
    const matchesFilter = filter === 'all' ||
      (filter === 'phishing' && scan.result === 'Phishing') ||
      (filter === 'legitimate' && scan.result === 'Legitimate');
    const matchesSearch = searchTerm === '' ||
      scan.displayText.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'Past Week';
      case 'month': return 'Past Month';
      case '3months': return 'Past 3 Months';
      case 'year': return 'Past Year';
      default: return 'All Time';
    }
  };

  const getConfidenceDisplay = (scan) => {
    if (scan.is_phishing) {
      return Math.round((scan.danger_score || scan.model_confidence || 0) * 100);
    } else {
      return Math.round((1 - (scan.danger_score || scan.model_confidence || 0)) * 100);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Scan History</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Scan History</h2>
        <button onClick={fetchScanHistory} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter Section */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="3months">Past 3 Months</option>
              <option value="year">Past Year</option>
            </select>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search scans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 w-full sm:w-64"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">✕</button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All Scans</button>
          <button onClick={() => setFilter('phishing')} className={`px-4 py-2 rounded-lg ${filter === 'phishing' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Phishing</button>
          <button onClick={() => setFilter('legitimate')} className={`px-4 py-2 rounded-lg ${filter === 'legitimate' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Legitimate</button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredScans.length} of {scans.length} scans
        {dateFilter !== 'all' && ` from ${getDateFilterLabel().toLowerCase()}`}
        {searchTerm && ` for "${searchTerm}"`}
      </div>

      {filteredScans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {scans.length === 0 ? "No scan history yet. Scan some content to see history here." : "No scans match your current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScans.map((scan) => {
            const scanTypeInfo = getScanTypeDisplay(scan.scan_source);
            return (
              <div key={scan.id} className="bg-white rounded-lg shadow border p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openScanDetails(scan)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${scan.result === 'Phishing' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {scan.result}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${scanTypeInfo.bgColor} ${scanTypeInfo.textColor}`}>
                        {scanTypeInfo.icon} {scanTypeInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(scan.date).toLocaleDateString()}</span>
                      {scan.hasImage && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">📷 Image</span>}
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{getConfidenceDisplay(scan)}% confidence</span>
                    </div>
                    <p className="text-gray-700 mb-2">{scan.displayText}</p>
                    <div className="text-sm text-gray-500">
                      Risk Score: {(scan.danger_score * 100).toFixed(1)}%
                      {scan.ocr_confidence && (
                        <span className="ml-3">OCR: {typeof scan.ocr_confidence === 'number' ? (scan.ocr_confidence * 100).toFixed(1) + '%' : scan.ocr_confidence}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && selectedScan && (() => {
        const scanTypeInfo = getScanTypeDisplay(selectedScan.scan_source);
        // Compute URL summary counts from url_analysis if available
        let safeCount = 0, suspiciousCount = 0, maliciousCount = 0, totalCount = 0;
        if (selectedScan.url_analysis && selectedScan.url_analysis.length > 0) {
          totalCount = selectedScan.url_analysis.length;
          selectedScan.url_analysis.forEach(u => {
            const status = u.status?.toUpperCase();
            if (status === 'SAFE') safeCount++;
            else if (status === 'SUSPICIOUS' || status === 'CAUTION') suspiciousCount++;
            else if (status === 'MALICIOUS') maliciousCount++;
          });
        } else if (selectedScan.url_statistics && selectedScan.url_statistics.total_urls > 0) {
          safeCount = selectedScan.url_statistics.safe_urls || 0;
          suspiciousCount = selectedScan.url_statistics.suspicious_urls || 0;
          maliciousCount = selectedScan.url_statistics.malicious_urls || 0;
          totalCount = selectedScan.url_statistics.total_urls || 0;
        } else if (selectedScan.urls_found) {
          totalCount = selectedScan.urls_found.length;
          // No status info – treat as unknown (counts stay 0)
        }

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Scan Details</h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Scan Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Result</div>
                    <div className={`font-semibold ${selectedScan.result === 'Phishing' ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedScan.result}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Risk Level</div>
                    <div className="font-semibold">{(selectedScan.danger_score * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Confidence</div>
                    <div className="font-semibold">{getConfidenceDisplay(selectedScan)}%</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Type</div>
                    <div className={`font-semibold inline-flex items-center gap-1 ${scanTypeInfo.textColor}`}>
                      <span>{scanTypeInfo.icon}</span>
                      <span className="text-sm">{scanTypeInfo.label}</span>
                    </div>
                  </div>
                </div>

                {/* Risk Banner */}
                {selectedScan.danger_score >= 0.7 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2"></span>
                      <div>
                        <div className="font-bold text-red-800">HIGH RISK PHISHING</div>
                        <div className="text-sm text-red-700">{selectedScan.explanation || 'Strong phishing indicators detected.'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedScan.danger_score >= 0.4 && selectedScan.danger_score < 0.7 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2"></span>
                      <div>
                        <div className="font-bold text-yellow-800">SUSPICIOUS</div>
                        <div className="text-sm text-yellow-700">{selectedScan.explanation || 'Multiple warning signs detected.'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedScan.danger_score < 0.4 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2"></span>
                      <div>
                        <div className="font-bold text-green-800">SAFE</div>
                        <div className="text-sm text-green-700">{selectedScan.explanation || 'No significant threats detected.'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scanned Image Section */}
                {selectedScan.hasImage && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Scanned Image</h4>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {imageLoading && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading image...</p>
                        </div>
                      )}
                      {!imageLoading && !imageError && selectedScan.imageUrl && (
                        <div className="text-center">
                          <img src={selectedScan.imageUrl} alt="Scanned email" className="max-w-full h-auto rounded-lg shadow-sm mx-auto max-h-96 object-contain" onLoad={() => setImageLoading(false)} onError={() => setImageError(true)} />
                          <p className="text-xs text-gray-500 mt-2">File: {selectedScan.image_filename || 'Unknown'}</p>
                        </div>
                      )}
                      {imageError && (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-4 text-4xl">📷</div>
                          <p className="text-gray-500 mb-2">Image Not Available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {(selectedScan.risk_factors && selectedScan.risk_factors.length > 0) && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Risk Factors</h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <ul className="space-y-2">
                        {selectedScan.risk_factors.map((factor, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                            <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* URL Analysis Section */}
                {selectedScan.urls_found && selectedScan.urls_found.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">URL Analysis</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {/* Summary counts */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{safeCount}</div>
                          <div className="text-sm text-gray-600">Safe</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{suspiciousCount}</div>
                          <div className="text-sm text-gray-600">Suspicious</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{maliciousCount}</div>
                          <div className="text-sm text-gray-600">Malicious</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                          <div className="text-sm text-gray-600">Total</div>
                        </div>
                      </div>

                      {/* Detailed URL list with status badges */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Detected URLs:</div>
                        {(selectedScan.url_analysis && selectedScan.url_analysis.length > 0 ? selectedScan.url_analysis : selectedScan.urls_found.map(url => ({ url, status: 'UNKNOWN' }))).slice(0, 10).map((item, idx) => {
                          const url = typeof item === 'string' ? item : item.url;
                          const status = typeof item === 'string' ? 'UNKNOWN' : (item.status || 'UNKNOWN').toUpperCase();
                          return (
                            <div key={idx} className="flex items-center justify-between border-t pt-2 text-sm">
                              <span className="truncate max-w-md font-mono text-xs">{url}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                status === 'MALICIOUS' ? 'bg-red-100 text-red-800' :
                                status === 'SUSPICIOUS' ? 'bg-yellow-100 text-yellow-800' :
                                status === 'CAUTION' ? 'bg-orange-100 text-orange-800' :
                                status === 'SAFE' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>{status}</span>
                            </div>
                          );
                        })}
                        {selectedScan.urls_found.length > 10 && (
                          <div className="text-xs text-gray-500">+ {selectedScan.urls_found.length - 10} more</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted Content */}
                <div>
                  <h4 className="text-lg font-semibold mb-3">Extracted Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans max-h-96 overflow-y-auto">
                      {selectedScan.extracted_text || selectedScan.displayText.replace('...', '')}
                    </pre>
                  </div>
                </div>

                {/* Scan Metadata */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Scan Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>Type:</div>
                    <div className="flex items-center gap-1"><span>{scanTypeInfo.icon}</span><span>{scanTypeInfo.label}</span></div>
                    <div>Date:</div>
                    <div>{new Date(selectedScan.date).toLocaleString()}</div>
                    <div>Risk Score:</div>
                    <div>{(selectedScan.danger_score * 100).toFixed(1)}%</div>
                    <div>Model Confidence:</div>
                    <div>{((selectedScan.model_confidence || selectedScan.danger_score) * 100).toFixed(1)}%</div>
                    <div>Image Available:</div>
                    <div>{selectedScan.hasImage ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}