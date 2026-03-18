/*
This file contains the API service functions for making HTTP requests to the backend server. 
Each function corresponds to a specific endpoint and HTTP method, allowing for easy integration with the frontend components.

The functionality here is to direct API calls to the backend server.
To route calls to the apiService, we can use the `browser.runtime.sendMessage` method from the frontend components, 
which will be handled in the background script (src/background.js). 
The background script will then call the appropriate function from this apiService based on the message received.
*/

const API_BASE_URL = "http://localhost:3000/api/"; // This is the base URL for the backend server. Adjust as needed.

// Template for API call functions
async function apiCall(endpoint, method = "GET", data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const json = await response.json();

    if (!response.ok) {
      return { ok: false, message: json.message ?? response.statusText, data: null };
    }
    return { ok: true, message: "", data: json };
  } catch (error) {
    console.error("API call error:", error);
    return { ok: false, message: error.message, data: null };
  }
}
/*
Example API functions that can be called from the messageHandler.
export async function getUserData() {
  return await apiCall("user/data");
}

export else it cant be used in the messageHandler.js
Apicall calls the function apiCall with the appropriate endpoint, method, and data.

*/

// Example API functions
export async function registerUser(credentials) {
  return await apiCall("users/", "POST", credentials);
}
export async function loginUser(credentials) {
  return await apiCall("auth/login", "POST", credentials);
}



