import React from 'react';
import ReactDOM from 'react-dom/client';
import { FloatingBar } from './components/FloatingBar';
import './styles/globals.css';
import './styles/floating-bar.css';

ReactDOM.createRoot(document.getElementById('floating-bar-root')!).render(
  <React.StrictMode>
    <FloatingBar />
  </React.StrictMode>,
);
