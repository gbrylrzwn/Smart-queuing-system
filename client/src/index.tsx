import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './router/appRouter';
import { AuthProvider } from './context/AuthContext';
import { GlobalAlertModal } from './components/common/GlobalAlertModal';
import './index.css';

Object.defineProperty(window, 'alert', {
  writable: true,
  configurable: true,
  value: (msg?: any) => {
    window.dispatchEvent(new CustomEvent('smartqueue-alert', { detail: String(msg || '') }));
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Application cannot mount.');
}

ReactDOM.createRoot(rootElement).render(
  <AuthProvider>
    <AppRouter />
    <GlobalAlertModal />
  </AuthProvider>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('ServiceWorker registration failed:', err);
    });
  });
}
