/*
This file contains the API service functions for making HTTP requests to the backend server. 
Each function corresponds to a specific endpoint and HTTP method, allowing for easy integration with the frontend components.

The functionality here is to direct API calls to the backend server.
To route calls to the apiService, we can use the `browser.runtime.sendMessage` method from the frontend components, 
which will be handled in the background script (src/background.js). 
The background script will then call the appropriate function from this apiService based on the message received.
*/

import storage from "../util/storage";

// This is the base URL for the backend server. 
const API_BASE_URL = __API_BASE_URL__; // Rollup replace will insert the actual value from env at __API_BASE_URL__

/**
 * Returns: { ok: boolean, message: string, data: any }
 * - ok: true if the request succeeded (HTTP 2xx)
 * - message: error message if ok is false, empty string otherwise
 * - parsed JSON response body, or null on failure
 */
async function apiCall(endpoint, method, data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`; // Include JWT token if available/needed

  const options = { method, headers };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const response_json = await response.json();

    if (!response.ok) {
      return { ok: false, message: response_json?.message ?? response.statusText };
    }
    return { ok: true, message: "", ...response_json };
  } catch (error) {
    console.error("API call error:", error);
    return { ok: false, message: error.message };
  }
}

async function authApiCall(endpoint, method, data = null) {
  return await apiCall(endpoint, method, data, await storage.jwt.get());
}

// API functions
export async function registerUser(credentials) {
  return await apiCall("users/", "POST", credentials);
}
export async function loginUser(credentials) {
  return await apiCall("auth/login", "POST", credentials);
}

export async function getUserSettings() {
  return await authApiCall("users/settings", "GET");
}

export async function updateUserSettings(patch) {
  return await authApiCall("users/settings", "PATCH", patch);
}
