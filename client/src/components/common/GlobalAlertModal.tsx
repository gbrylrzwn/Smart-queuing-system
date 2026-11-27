import React, { useEffect, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDanger: boolean;
  resolve?: (value: boolean) => void;
}

export const showConfirm = (options: {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('smartqueue-confirm', {
        detail: {
          title: options.title || 'אישור פעולה',
          message: options.message,
          confirmText: options.confirmText || 'כן, המשך',
          cancelText: options.cancelText || 'ביטול',
          isDanger: options.isDanger ?? false,
          resolve,
        },
      })
    );
  });
};

export const GlobalAlertModal: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'אישור',
    cancelText: 'ביטול',
    isDanger: false,
  });

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const text = (event as CustomEvent<string>).detail || '';
      if (!text.trim()) return;

      const isError = /שגיאה|נכשל|לא ניתן|אין כרגע|חובה|אסור/.test(text);
      const isSuccess = /בהצלחה|אושר|בוטל|נשמר|הועתק|עודכן/.test(text);
      const id = Date.now() + Math.random();

      setToasts((prev) => [
        ...prev.slice(-2),
        { id, message: text, type: isError ? 'error' : isSuccess ? 'success' : 'info' },
      ]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    const handleConfirm = (event: Event) => {
      const detail = (event as CustomEvent<Omit<ConfirmState, 'isOpen'>>).detail;
      setConfirmState({ isOpen: true, ...detail });
    };

    window.addEventListener('smartqueue-alert', handleAlert);
    window.addEventListener('smartqueue-confirm', handleConfirm);
    return () => {
      window.removeEventListener('smartqueue-alert', handleAlert);
      window.removeEventListener('smartqueue-confirm', handleConfirm);
    };
  }, []);

  const handleConfirmChoice = (choice: boolean) => {
    if (confirmState.resolve) confirmState.resolve(choice);
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  const styleMap = {
    success: { icon: '✅', border: 'border-emerald-200 bg-white text-slate-800', bar: 'bg-emerald-500' },
    error: { icon: '⚠️', border: 'border-red-200 bg-white text-slate-800', bar: 'bg-red-500' },
    info: { icon: '✨', border: 'border-blue-200 bg-white text-slate-800', bar: 'bg-blue-600' },
  };

  return (
    <>
      {toasts.length > 0 && (
        <div
          dir="rtl"
          style={{ zIndex: 99999 }}
          className="fixed bottom-4 right-4 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        >
          {toasts.map((toast) => {
            const st = styleMap[toast.type];
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-xl px-4 py-3.5 flex items-start gap-3 animate-toast-in ${st.border}`}
              >
                <span className={`absolute right-0 top-0 bottom-0 w-1.5 ${st.bar}`} />
                <span className="text-lg leading-none mt-0.5">{st.icon}</span>
                <p className="text-sm font-medium leading-snug flex-1 whitespace-pre-line">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold px-1"
                  aria-label="סגור התראה"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {confirmState.isOpen && (
        <div
          dir="rtl"
          style={{ zIndex: 99999 }}
          className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => handleConfirmChoice(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-14 h-14 mx-auto mb-4 rounded-2xl border flex items-center justify-center text-2xl ${
                confirmState.isDanger
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {confirmState.isDanger ? '🗑️' : '❓'}
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">{confirmState.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
              {confirmState.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-md ${
                  confirmState.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
