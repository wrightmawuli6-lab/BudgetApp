import axios from "axios";

const userApiBase = import.meta.env.VITE_API_BASE_URL;
if (!userApiBase) {
  throw new Error("VITE_API_BASE_URL is required. Set it in your frontend environment.");
}

const adminApiBase = import.meta.env.VITE_ADMIN_API_BASE_URL || `${userApiBase.replace(/\/api\/?$/, "")}/admin/api`;

export const adminApiClient = axios.create({
  baseURL: adminApiBase,
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
