import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

// No StrictMode: its double-mount would create two WebGL contexts for the one fixed stage.
createRoot(document.getElementById('root')).render(<App />);
