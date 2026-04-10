import axios from "axios";
import { getStoredAuth } from "./authStorage";

const DEFAULT_API_BASE_URL = "https://attendance-backend.onrender.com/api";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const api = axios.create({
  // Shared HTTP client used by all frontend service files.
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Automatically attach auth token so protected QR/admin endpoints can be called.
  const { token } = getStoredAuth();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
