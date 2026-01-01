// Global Error Handler for "Blank Screen" Debugging
console.log("📍 index.tsx: Script execution started!");
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.background = '#ff0000';
  errorDiv.style.color = '#ffffff';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.innerHTML = `
    <h3>Application Error</h3>
    <p>Message: ${message}</p>
    <p>Source: ${source}:${lineno}:${colno}</p>
    <pre>${error?.stack || 'No stack trace'}</pre>
  `;
  document.body.appendChild(errorDiv);
};

window.onunhandledrejection = function (event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.bottom = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.background = '#800000';
  errorDiv.style.color = '#ffffff';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.innerHTML = `
      <h3>Unhandled Promise Rejection</h3>
      <p>Reason: ${event.reason}</p>
    `;
  document.body.appendChild(errorDiv);
};

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);