/*
This file contains the API service functions for making HTTP requests to the backend server. 
Each function corresponds to a specific endpoint and HTTP method, allowing for easy integration with the frontend components.

The functionality here is to direct API calls to the backend server.
To route calls to the apiService, we can use the `browser.runtime.sendMessage` method from the frontend components, 
which will be handled in the background script (src/background.js). 
The background script will then call the appropriate function from this apiService based on the message received.
*/

const API_BASE_URL = "http://127.0.0.1:3000/"; // This is the base URL for the backend


