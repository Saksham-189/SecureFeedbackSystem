import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./index.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { initializeSecurityLayer } from "./services/api.js";

// Initialize CSRF and security layers before app fully renders
initializeSecurityLayer();

/**
 * Application entry point.
 *
 * Provider hierarchy (outermost → innermost):
 * 1. React.StrictMode — development checks
 * 2. AuthProvider — session management (wraps everything so all components can access user)
 * 3. ToastProvider — notification system (available everywhere including login)
 * 4. App — routing + pages
 */
ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <AuthProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </AuthProvider>
    </React.StrictMode>
);
