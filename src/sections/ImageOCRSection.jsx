import React, { useState, useRef } from "react";
import { auth } from "../firebase";

export default function ImageOCRSection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 10 * 1024 * 1024;

    if (!file) {
      return { valid: false, error: "No file selected" };
    }

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Please upload JPG, PNG, or WEBP images only.",
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File too large. Maximum size is 10MB.",
      };
    }

    return { valid: true };
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError("");
    setErrorType("");
    setOcrResult("");
    setAnalysis(null);

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      setErrorType("file_error");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("border-indigo-400", "dark:border-indigo-500");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-indigo-400", "dark:border-indigo-500");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-indigo-400", "dark:border-indigo-500");
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      setError("");
      setErrorType("");
      setOcrResult("");
      setAnalysis(null);

      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error);
        setErrorType("file_error");
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const performOCR = async () => {
    if (!file) {
      setError("Please select an image first");
      setErrorType("file_error");
      return;
    }

    setLoading(true);
    setProgress(0);
    setError("");
    setErrorType("");
    setOcrResult("");
    setAnalysis(null);

    try {
      setProgress(20);
      
      const user = auth.currentUser;
      if (!user) {
        setError("Please log in to analyze emails");
        setErrorType("auth_error");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      
      const formData = new FormData();
      formData.append('file', file);

      console.log("Sending image to backend for OCR analysis...");
      setProgress(40);

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/ocr/scan-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Backend response error:", errorText);
        let errorDetail = `Backend error: ${res.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorDetail = errorData.detail || errorData.error || errorDetail;
        } catch (e) {
          if (errorText.includes("detail")) {
            const match = errorText.match(/"detail":\s*"([^"]+)"/);
            errorDetail = match ? match[1] : errorText;
          } else {
            errorDetail = errorText || errorDetail;
          }
        }
        throw new Error(errorDetail);
      }

      const data = await res.json();
      console.log("Backend analysis response:", data);

      setProgress(80);

      // Handle different error types from backend
      if (!data.success) {
        setError(data.error);
        setErrorType(data.error_type || "processing_error");
        setLoading(false);
        return;
      }

      if (data.extracted_text) {
        setOcrResult(data.extracted_text);
      } else {
        setError("No text could be extracted from this image.");
        setErrorType("insufficient_text");
        setLoading(false);
        return;
      }
      
      //  CRITICAL FIX: Use the DIRECT data from backend
      const isPhishing = data.is_phishing === true;
      const dangerScore = data.danger_score;
      
      console.log(" FRONTEND PROCESSING:");
      console.log("is_phishing:", data.is_phishing);
      console.log("danger_score:", data.danger_score);
      console.log("explanation:", data.explanation);
      console.log("risk_factors:", data.risk_factors);
      
      setAnalysis({
        //  FIXED: Use direct data properties
        label: isPhishing ? "phishing" : "legitimate",
        danger_score: dangerScore,
        explanation: data.explanation || "SAFE: This email appears legitimate with high confidence. No significant threats detected.",
        risk_factors: data.risk_factors || [],
        suspicious_patterns: data.suspicious_patterns || [],
        emails: data.emails || [],
        urls: data.urls || [],
        ocrConfidence: data.ocr_confidence || "High",
        emailConfidence: data.email_validation?.confidence || "High",
        model_confidence: data.model_confidence || data.danger_score,
        method: data.method || "content-analysis",
        url_analysis: data.url_analysis || [],
        url_statistics: data.url_statistics || {
          total_urls: data.urls?.length || 0,
          safe_urls: data.urls?.length || 0,
          suspicious_urls: 0,
          malicious_urls: 0
        }
      });
      
      setProgress(100);
      
      setTimeout(() => {
        setLoading(false);
      }, 500);
      
    } catch (err) {
      console.error("Processing Error:", err);
      
      //  IMPROVED ERROR HANDLING: Show descriptive messages
      let errorMessage = err.message || "Analysis failed. Please try again.";
      
      // Customize messages for specific cases
      if (errorMessage.includes("clearer screenshot") || 
          errorMessage.includes("read text") || 
          errorMessage.includes("not clear enough")) {
        errorMessage = "Please upload a clear email screenshot. This image doesn't contain readable text.";
        setErrorType("poor_quality");
      } 
      else if (errorMessage.includes("not enough text") || 
               errorMessage.includes("insufficient text")) {
        errorMessage = "Please upload an email screenshot. This image doesn't contain enough text to analyze.";
        setErrorType("insufficient_text");
      }
      else if (errorMessage.includes("not an email") || 
               errorMessage.includes("doesn't appear to be an email")) {
        errorMessage = "Please upload an email screenshot. This content doesn't appear to be an email.";
        setErrorType("wrong_content");
      }
      else if (errorMessage.includes("file type") || errorMessage.includes("file too large")) {
        setErrorType("file_error");
      } 
      else {
        setErrorType("processing_error");
        errorMessage = "Please upload a clear email screenshot and try again.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setOcrResult("");
    setError("");
    setErrorType("");
    setAnalysis(null);
    setProgress(0);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getRiskLevelColor = (dangerScore) => {
    if (dangerScore >= 0.8) return "bg-red-500";
    if (dangerScore >= 0.6) return "bg-orange-500";
    if (dangerScore >= 0.4) return "bg-yellow-500";
    if (dangerScore >= 0.2) return "bg-blue-500";
    return "bg-green-500";
  };

  const getRiskLevelText = (dangerScore) => {
    if (dangerScore >= 0.8) return "CRITICAL RISK";
    if (dangerScore >= 0.6) return "HIGH RISK";
    if (dangerScore >= 0.4) return "MEDIUM RISK";
    if (dangerScore >= 0.2) return "LOW RISK";
    return "VERY LOW RISK";
  };

  const getRiskLevelBadgeColor = (dangerScore) => {
    if (dangerScore >= 0.8) return "bg-red-500 text-white";
    if (dangerScore >= 0.6) return "bg-orange-500 text-white";
    if (dangerScore >= 0.4) return "bg-yellow-500 text-black";
    if (dangerScore >= 0.2) return "bg-blue-500 text-white";
    return "bg-green-500 text-white";
  };

  const formatMethod = (method) => {
    if (!method) return 'AI Analysis';
    return method.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'poor_quality':
        return (
          <svg className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'wrong_content':
        return (
          <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'insufficient_text':
        return (
          <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getErrorColor = (errorType) => {
    switch (errorType) {
      case 'poor_quality':
        return "bg-orange-50 dark:bg-orange-900 border-orange-500 dark:border-orange-400";
      case 'wrong_content':
        return "bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400";
      case 'insufficient_text':
        return "bg-yellow-50 dark:bg-yellow-900 border-yellow-500 dark:border-yellow-400";
      default:
        return "bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Email Screenshot Scanner
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Upload a screenshot of an email to extract and analyze for phishing threats
        </p>
      </div>

      <div 
        className="bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors duration-300"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center cursor-pointer"
        >
          <svg
            className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PNG, JPG, WEBP up to 10MB
          </span>
        </label>
      </div>

      {preview && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Image Preview:
          </h3>
          <img
            src={preview}
            alt="Preview"
            className="max-w-full h-auto max-h-96 mx-auto rounded border border-gray-300 dark:border-gray-600"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {file?.name} ({(file?.size / 1024).toFixed(2)} KB)
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={performOCR}
          disabled={!file || loading}
          className="flex-1 px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing... {progress}%
            </>
          ) : (
            "Scan Email"
          )}
        </button>
        {(file || ocrResult || analysis) && (
          <button
            onClick={clearAll}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 transition-all duration-300 ${getRiskLevelColor(progress / 100)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className={`border-l-4 p-4 rounded ${getErrorColor(errorType)}`}>
          <div className="flex items-start">
            {getErrorIcon(errorType)}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {errorType === 'poor_quality' && 'Image Quality Issue'}
                {errorType === 'wrong_content' && 'Wrong Content Type'}
                {errorType === 'insufficient_text' && 'Insufficient Text'}
                {!errorType && 'Error'}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-4">
          {/* SMART OCR WARNING: Only show when backend indicates poor OCR AND it's phishing */}
          {analysis.ocrConfidence === "Low" && analysis.label === "phishing" && (
            <div className="bg-orange-50 dark:bg-orange-900 border-l-4 border-orange-500 dark:border-orange-400 p-4 rounded">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200">OCR Quality Note</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Text extraction quality may be low. Some URLs or details might not be detected properly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Result Card */}
          <div className={`border-l-4 p-4 rounded ${
            analysis.label === "phishing" 
              ? "bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-400" 
              : "bg-green-50 dark:bg-green-900 border-green-500 dark:border-green-400"
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {analysis.label === "phishing" ? "PHISHING EMAIL DETECTED" : "LEGITIMATE EMAIL"}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskLevelBadgeColor(analysis.danger_score)}`}>
                    {getRiskLevelText(analysis.danger_score)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {analysis.label === "phishing" ? "Phishing Confidence" : "Safety Confidence"}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {analysis.label === "phishing" 
                        ? Math.round(analysis.danger_score * 100) + "%"
                        : Math.round((1 - analysis.danger_score) * 100) + "%"
                      }
                    </p>
                  </div>
                  <div>
                    {/* <p className="text-sm text-gray-600 dark:text-gray-400">Analysis Method</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatMethod(analysis.method)}
                    </p> */}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Risk Level</span>
                    <span>{(analysis.danger_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getRiskLevelColor(analysis.danger_score)} transition-all duration-500`}
                      style={{ width: `${analysis.danger_score * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {analysis.explanation}
                  </p>
                  
                  {/* SMART SECURITY RECOMMENDATIONS: Only show for phishing */}
                  {analysis.label === "phishing" && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900 rounded border border-red-200 dark:border-red-700">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 text-sm mb-2">
                        SECURITY RECOMMENDATIONS:
                      </h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        <li>• DO NOT click any links in this email</li>
                        <li>• DO NOT provide any personal information</li>
                        <li>• Verify account status directly through official website</li>
                        <li>• Delete this email immediately</li>
                        <li>• Report as phishing to your email provider</li>
                      </ul>
                    </div>
                  )}
                  
                  {/* POSITIVE FEEDBACK FOR SAFE EMAILS */}
                  {analysis.label === "legitimate" && analysis.danger_score < 0.3 && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900 rounded border border-green-200 dark:border-green-700">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 text-sm mb-2">
                        EMAIL STATUS: SAFE
                      </h4>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• This email appears to be legitimate</li>
                        <li>• No significant security threats detected</li>
                        <li>• Standard email security practices recommended</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          {analysis.risk_factors && analysis.risk_factors.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-2">
                Risk Factors Found:
              </h4>
              <ul className="space-y-2">
                {analysis.risk_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-800 dark:text-orange-300">
                    <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suspicious Patterns */}
          {analysis.suspicious_patterns && analysis.suspicious_patterns.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Suspicious Patterns:
              </h4>
              <ul className="space-y-2">
                {analysis.suspicious_patterns.map((pattern, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <span className="inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Email Addresses */}
          {analysis.emails && analysis.emails.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Email Addresses Found ({analysis.emails.length}):
              </h4>
              <div className="space-y-2">
                {analysis.emails.map((email, i) => (
                  <div key={i} className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 font-mono break-all">
                    {email}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* URL Analysis */}
          {analysis.urls && analysis.urls.length > 0 ? (
            <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                URL Analysis:
              </h4>
              
              {analysis.url_statistics && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-green-100 dark:bg-green-800 rounded">
                    <div className="text-lg font-bold text-green-800 dark:text-green-200">{analysis.url_statistics.safe_urls || 0}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">Safe</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-800 rounded">
                    <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">{analysis.url_statistics.suspicious_urls || 0}</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">Suspicious</div>
                  </div>
                  <div className="text-center p-2 bg-red-100 dark:bg-red-800 rounded">
                    <div className="text-lg font-bold text-red-800 dark:text-red-200">{analysis.url_statistics.malicious_urls || 0}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Malicious</div>
                  </div>
                  <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{analysis.url_statistics.total_urls || analysis.urls.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                  </div>
                </div>
              )}
              
              {analysis.url_analysis && analysis.url_analysis.length > 0 ? (
                <div className="space-y-3">
                  {analysis.url_analysis.map((urlAnalysis, i) => (
                    <div 
                      key={i} 
                      className={`border-l-4 p-3 rounded ${
                        urlAnalysis.status === 'Malicious' 
                          ? 'bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-400' 
                          : urlAnalysis.status === 'Suspicious'
                          ? 'bg-orange-50 dark:bg-orange-900 border-orange-500 dark:border-orange-400'
                          : 'bg-green-50 dark:bg-green-900 border-green-500 dark:border-green-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              urlAnalysis.status === 'Malicious' 
                                ? 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200'
                                : urlAnalysis.status === 'Suspicious'
                                ? 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                                : 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200'
                            }`}>
                              {urlAnalysis.status}
                            </span>
                            {urlAnalysis.has_https && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                HTTPS
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-mono break-all text-gray-900 dark:text-white mb-2">
                            {urlAnalysis.url}
                          </p>
                          {urlAnalysis.reasons && urlAnalysis.reasons.length > 0 && (
                            <ul className="text-xs space-y-1">
                              {urlAnalysis.reasons.map((reason, reasonIndex) => (
                                <li 
                                  key={reasonIndex} 
                                  className="text-gray-700 dark:text-gray-300"
                                >
                                  • {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {analysis.urls.map((url, i) => (
                    <div key={i} className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 break-all">
                      {url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : analysis.label === "phishing" ? (
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                URL Detection Note
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                No URLs were detected in the extracted text. This could be due to:
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 mt-2 space-y-1">
                <li>• Poor image quality affecting OCR accuracy</li>
                <li>• URLs being embedded in images rather than text</li>
                <li>• Suspicious links disguised as normal text</li>
              </ul>
            </div>
          ) : null}

          {/* Confidence Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">OCR Confidence</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {analysis.ocrConfidence}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Text extraction accuracy</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">Email Confidence</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {analysis.emailConfidence}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email structure validation</p>
            </div>
            {/* <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {analysis.label === "phishing" ? "Phishing Confidence" : "Safety Confidence"}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {analysis.label === "phishing" 
                  ? Math.round((analysis.model_confidence || analysis.danger_score) * 100) + "%"
                  : Math.round((1 - (analysis.model_confidence || analysis.danger_score)) * 100) + "%"
                }
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {analysis.label === "phishing" 
                  ? "Confidence this is phishing" 
                  : "Confidence this is safe"
                }
              </p>
            </div> */}
          </div>

          {ocrResult && (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-800 dark:text-white">
                  Extracted Text (OCR Result):
                </h4>
                <button
                  onClick={() => navigator.clipboard.writeText(ocrResult)}
                  className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 px-2 py-1 rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Text
                </button>
              </div>
              <pre className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 p-3 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto font-sans">
                {ocrResult}
              </pre>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {ocrResult.length} characters extracted • 
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}