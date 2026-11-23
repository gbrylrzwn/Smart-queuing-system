// src/App.tsx
import React from 'react';
import AppRouter from './router/appRouter';
import { GlobalAlertModal } from './components/common/GlobalAlertModal';
import { InstallPromptBanner } from './components/common/InstallPromptBanner';

/**
 * רכיב האב הראשי של אפליקציית ה-Frontend
 * תפקידו הארכיטקטוני הוא לרנדר את מערכת הניווט והמסכים הכללית
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-right font-sans antialiased text-gray-900" dir="rtl">
      {/* הפעלת מרכזיית הניווט, המסכים ושומרי הנתיבים המאובטחים */}
      <AppRouter />
      <GlobalAlertModal />
      <InstallPromptBanner />
    </div>
  );
};

export default App;
