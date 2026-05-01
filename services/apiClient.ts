import axios from "axios";
import { logout } from "../auth";
import { buildApiRoot, getApiErrorMessage, resolveApiBaseUrl } from "./apiConfig";

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const API_ROOT = buildApiRoot(API_BASE_URL);
export const USAGE_STREAK_EVENT = "budgeting-usage-streak";

function dispatchUsageStreak(streakHeader: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  const streak = Number(streakHeader);
  if (!Number.isFinite(streak) || streak < 0) {
    return;
  }

  window.dispatchEvent(new CustomEvent<number>(USAGE_STREAK_EVENT, { detail: streak }));
}

export const apiClient = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("budgeting_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    dispatchUsageStreak(response.headers?.["x-usage-streak"]);
    return response;
  },
  (error) => {
    dispatchUsageStreak(error?.response?.headers?.["x-usage-streak"]);
    if (error.response?.status === 401) {
      logout();
      window.location.hash = "#/login";
    }
    error.userMessage = getApiErrorMessage(error, "Request failed.");
    return Promise.reject(error);
  }
);
