import React from 'react';
import AppRouter from './router/appRouter';
import { GlobalAlertModal } from './components/common/GlobalAlertModal';
import { InstallPromptBanner } from './components/common/InstallPromptBanner';
import { SmartQueueAssistant } from './components/common/SmartQueueAssistant';

const App: React.FC = () => {
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
          </div>
        </div>
      </footer>

      <GlobalAlertModal />
      <InstallPromptBanner />
      <SmartQueueAssistant />
    </div>
  );
};

export default App;
