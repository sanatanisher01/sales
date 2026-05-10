import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { useAuthStore } from './store/authStore';

// Hydrate auth token + Firebase sign-in on page load
useAuthStore.getState().hydrate();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', maxWidth: '360px' },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
