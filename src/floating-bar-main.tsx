import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingBar } from './components/FloatingBar';
import { AppThemeProvider } from './contexts/ThemeProvider';
import { LocaleProvider } from './i18n';
import { installCrashCapture } from '@/lib/crashCapture';
import './styles/globals.css';
import './styles/floating-bar.css';

installCrashCapture();

ReactDOM.createRoot(document.getElementById('floating-bar-root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <LocaleProvider>
        <FloatingBar />
      </LocaleProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
