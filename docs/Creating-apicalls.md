# API Integration Documentation

This document explains how to add new API calls to the extension.

---

## Architecture Overview

```
Frontend (Svelte)
    └── browser.runtime.sendMessage({ type: "...", ...payload })
            │
            ▼
Background Script (messageHandler.js)
    └── Receives message, calls apiService function
            │
            ▼
API Service (apiService.js)
    └── Makes HTTP request to backend
            │
            ▼
Backend Server (http://localhost:3000/api/)
```

All frontend-to-backend communication goes through `browser.runtime.sendMessage`. Direct API calls from the frontend are not used. The background script acts as the sole intermediary.


## Step 1 — Add a Function in `apiService.js`

Use the `apiCall` helper. It handles headers, JSON serialization, and error normalization automatically.
For requests that require authentication, use `authApiCall` which automatically includes the JWT.

### `apiCall` Signature

```javascript
apiCall(endpoint, method, data = null, token = null)
```
What do the Parameters mean?

| Parameter  | Type     | Description                                              |
|------------|----------|----------------------------------------------------------|
| `endpoint` | `string` | Path appended to `API_BASE_URL` (e.g. `"auth/login"`) |
| `method`   | `string` | HTTP method: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`      |
| `data`     | `object` | Request body (optional, dont add for GET requests)       |
| `token`    | `string` | JWT for Authorization header (auto-read from storage)    |


### `authApiCall` Signature

```javascript
authApiCall(endpoint, method, data = null)
```
What do the parameters mean?
| Parameter  | Type     | Description                                              |
|------------|----------|----------------------------------------------------------|
| `endpoint` | `string` | Path appended to `API_BASE_URL` (e.g. `"auth/login"`)    |
| `method`   | `string` | HTTP method: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`      |
| `data`     | `object` | Request body (optional, dont add for GET requests)       |

## Step 2 — Add a Handler in `apiHandler.js`

Add a new `if` block inside `handleApiMessage`. Follow the existing pattern, by checking the `message.type`. Then call your `apiService` function, and return the result.

```javascript
if (message.type === "api:<yourMessageType>") {
  const result = await yourApiFunction({ field: message.field });
  return validateResult(result);
}
```

### Using `toTokenResult` for Auth Calls

`toTokenResult` is a helper that shapes the result of auth calls into a consistent format. It checks if the response contains a valid token and returns an object with `ok`, `message`, and `token` fields.


Use `toTokenResult` for **auth-related calls** that return a token. For calls that return other data, return the result directly or shape it manually.

### Returning Custom Data

```javascript
if (message.type === "user:getProfile") {
  const result = await getUserProfile();
  if (!result.ok) {
    return { ok: false, message: result.message, data: null };
  }
  return { ok: true, data: result.data };
}
```

## Step 3 — Call from the Frontend

Use `browser.runtime.sendMessage` and pass the message type plus any required fields.

```javascript
async function callYourEndpoint(payload) {
  try {
    const result = await browser.runtime.sendMessage({
      type: "your:messageType", // type is important we use that to figuere out what type of message it is in the handler
      field: payload.field,
      // ...other fields this is the message can be anything you want
    });

    if (!result || !result.ok) {
      return { ok: false, message: result?.message || "Server error. Please try again." };
    }

    return result;
  } catch (error) {
    return { ok: false, message: "Could not reach the server." };
  }
}
```

## For more detail

Please inspect the current existing api calls for their functionality and how they integrate with each other
