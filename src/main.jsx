import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ExamAnalysisPage from './pages/ExamAnalysisPage.jsx';
import './index.css';

// ── Micro-router por pathname ──────────────────────────────────
const path = window.location.pathname;
const isBcrp = path === '/bcrp' || path.startsWith('/bcrp/');

createRoot(document.getElementById('root')).render(
  isBcrp ? <ExamAnalysisPage /> : <App />
);
