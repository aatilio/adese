import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import CeuPage from './pages/CeuPage.jsx';
import ExamAnalysisPage from './pages/ExamAnalysisPage.jsx';
import './index.css';

// ── Micro-router por pathname ──────────────────────────────────
const path = window.location.pathname;
const isCeu  = path === '/ceu'  || path.startsWith('/ceu/');
const isBcrp = path === '/bcrp' || path.startsWith('/bcrp/');

createRoot(document.getElementById('root')).render(
  isCeu  ? <CeuPage /> :
  isBcrp ? <ExamAnalysisPage /> :
  <App />
);
