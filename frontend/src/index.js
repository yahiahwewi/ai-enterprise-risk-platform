import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { ExtractionProvider } from './context/ExtractionContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <ExtractionProvider>
              <App />
            </ExtractionProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
