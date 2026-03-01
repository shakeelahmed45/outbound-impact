import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker, clearBadge, setBadge } from './services/pushService'

// ─── Register Service Worker for PWA + Push Notifications ───
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}

// ─── Clear badge when app comes to focus ───
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Clear badge when user opens the app
    clearBadge();
  }
});

// ─── Also clear on window focus (covers more cases) ───
window.addEventListener('focus', () => {
  clearBadge();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
