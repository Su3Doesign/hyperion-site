import { createRoot } from 'react-dom/client';
import './fonts/fonts.css';
import './styles.css';
import App from './App.jsx';
import car from './cars/index.js';

// each car can bring its own accents (CSS custom properties the Tailwind theme reads)
for (const [k, v] of Object.entries(car.theme || {})) if (k.startsWith('--')) document.documentElement.style.setProperty(k, v);

// No StrictMode: its double-mount would create two WebGL contexts for the one fixed stage.
createRoot(document.getElementById('root')).render(<App />);
