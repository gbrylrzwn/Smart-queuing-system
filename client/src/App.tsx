import React, { useEffect } from 'react';
import AppRouter from './router/appRouter';
import { GlobalAlertModal } from './components/common/GlobalAlertModal';
import { InstallPromptBanner } from './components/common/InstallPromptBanner';

const App: React.FC = () => {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(0, 0, 64, 64, 16);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeRect(16, 20, 32, 28);
      ctx.beginPath();
      ctx.moveTo(16, 29);
      ctx.lineTo(48, 29);
      ctx.moveTo(24, 14);
      ctx.lineTo(24, 22);
      ctx.moveTo(40, 14);
      ctx.lineTo(40, 22);
      ctx.stroke();

      ctx.strokeStyle = '#93c5fd';
      ctx.beginPath();
      ctx.moveTo(26, 38);
      ctx.lineTo(30, 42);
      ctx.lineTo(38, 34);
      ctx.stroke();

      const pngUrl = canvas.toDataURL('image/png');
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = pngUrl;
    }
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 text-right font-sans antialiased text-gray-900 flex flex-col" dir="rtl">
      <div className="flex-1 flex flex-col">
        <AppRouter />
      </div>

      <footer className="bg-white border-t border-slate-200/80 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold text-slate-700">
            SmartQueue | תור חכם — ניהול וקביעת תורים מתקדמת
          </span>
          <div className="flex items-center gap-5 font-bold">
            <a href="/about" className="text-slate-600 hover:text-blue-600 transition-colors">
              היכרות עם המערכת
            </a>
            <a href="/privacy" className="text-slate-600 hover:text-blue-600 transition-colors">
              מדיניות פרטיות ותנאי שימוש
            </a>
            <a href="/status" className="text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              סטטוס מערכת חי
            </a>

          </div>
        </div>
      </footer>

      <GlobalAlertModal />
      <InstallPromptBanner />
    </div>
  );
};

export default App;
