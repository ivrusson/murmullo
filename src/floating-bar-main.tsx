import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingBar } from './components/FloatingBar';
import { AppThemeProvider } from './contexts/ThemeProvider';
import { LocaleProvider } from './i18n';
import { installBrowserCorrectionHost } from '@/correction/host';
import { installCrashCapture } from '@/lib/crashCapture';
import './styles/globals.css';
import './styles/floating-bar.css';

installCrashCapture();
installBrowserCorrectionHost();

ReactDOM.createRoot(document.getElementById('floating-bar-root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <LocaleProvider>
        <FloatingBar />
      </LocaleProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
