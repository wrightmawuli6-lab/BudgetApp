import axios from "axios";
import { logout } from "../auth";

function getRequiredClientEnv(name: "VITE_API_BASE_URL") {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`${name} is required. Set it in your frontend environment.`);
  }
  return value;
}

const API_BASE_URL = getRequiredClientEnv("VITE_API_BASE_URL");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.hash = "#/login";
    }
    return Promise.reject(error);
  }
);
