import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2 } from 'lucide-react';
import './index.css';
import './i18n.js';
import App from './App.jsx';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <div className="text-slate-500 dark:text-slate-400">
        <p className="font-semibold">Mempersiapkan Aplikasi...</p>
        <p className="text-xs mt-1">
          Mohon tunggu sebentar, sedang memuat data dan preferensi Anda.
        </p>
      </div>
    </div>
  </div>
);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  </React.StrictMode>
);
