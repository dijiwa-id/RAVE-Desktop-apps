import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/staatliches';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './styles.css';
import App from './App';

// Menu konteks bawaan WebView (Reload/Inspect) disembunyikan di build rilis.
if (import.meta.env.PROD) window.addEventListener('contextmenu', (e) => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
