// Global Error Handler for "Blank Screen" Debugging
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
import './index.css';
import MainRouter from './components/MainRouter';

console.log('[Entry] index.tsx starting...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Entry] Root element not found!');
  throw new Error("Could not find root element to mount to");
}

console.log('[Entry] Mounting React app...');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MainRouter />
  </React.StrictMode>
);
console.log('[Entry] Mount command issued.');