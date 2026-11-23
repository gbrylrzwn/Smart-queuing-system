import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const wasDismissed = sessionStorage.getItem('pwa_install_dismissed') === 'true';

    if (isStandalone || wasDismissed) {
      setDismissed(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    if (isIos) {
      setShowIosGuide(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_install_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || (!deferredPrompt && !showIosGuide)) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-blue-200 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow">
          SQ
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">התקן את תור חכם | SmartQueue</h4>
          {deferredPrompt ? (
            <p className="text-xs text-gray-600 mt-0.5">
              גישה מהירה בלחיצה אחת ישירות ממסך הבית
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              לחץ על כפתור השיתוף <span className="font-bold text-blue-600">⍗</span> למטה ובחר{' '}
              <span className="font-bold text-gray-900">"הוסף למסך הבית"</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition"
          >
            התקן
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="סגור"
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg text-sm font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
