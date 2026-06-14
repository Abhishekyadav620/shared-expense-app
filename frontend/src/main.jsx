/**
 * Application entry point — mounts React into the DOM.
 * Vite loads this file from index.html via <script type="module">.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
