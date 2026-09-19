import ReactDOM from 'react-dom/client';
import App from './App';
import { installCrashCapture } from '@/lib/crashCapture';
import './styles/globals.css';

installCrashCapture();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
);
