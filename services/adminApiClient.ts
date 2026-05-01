import axios from "axios";
import { buildApiRoot, resolveApiBaseUrl, stripApiSuffix } from "./apiConfig";

const userApiBase = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const adminApiBase =
  import.meta.env.VITE_ADMIN_API_BASE_URL || `${stripApiSuffix(userApiBase)}/admin/api`;

export const adminApiClient = axios.create({
  baseURL: adminApiBase.endsWith("/api") ? adminApiBase : buildApiRoot(adminApiBase),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("budgeting_admin_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
