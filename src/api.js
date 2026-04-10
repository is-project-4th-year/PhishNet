// src/api.js - FINAL FIXED VERSION
import axios from "axios";
import { auth } from "./firebase";

const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// FIXED: Proper token interceptor with error handling
API.interceptors.request.use(async (config) => {
  try {
    // Wait for auth to be ready
    await auth.authStateReady();
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken();
      console.log(" Token attached to request");
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(" No user found for token");
    }
  } catch (error) {
    console.error(" Error getting token:", error);
  }
  return config;
});

// API Endpoints
export const fetchProfile = () => API.get("/api/auth/sync");
export const scanText = (data) => API.post("/api/scan-text", data);
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/api/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getScans = () => API.get("/api/scans/history");
export const getAnalytics = () => API.get("/api/analytics/quick");
export const exportReport = () => API.get("/api/export?fmt=csv", { responseType: "blob" });
export const ocrScanImage = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/api/ocr/scan-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getOcrScans = () => API.get("/api/ocr/scans/history");
export const getTextScans = () => API.get("/api/text/scans/history");
export const getScanImage = (scanId) => API.get(`/api/ocr/scans/${scanId}/image`);
export const getAdminUsers = () => API.get("/api/admin/users");
export const getAdminScans = () => API.get("/api/admin/scans/history");
export const getAdminAnalytics = () => API.get("/api/admin/analytics/comprehensive");
export const exportAllData = () => API.get("/api/admin/export/all-data", { responseType: "blob" });

export default API;