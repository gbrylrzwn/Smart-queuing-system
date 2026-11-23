import React, { useEffect, useState } from 'react';

interface AlertState {
  isOpen: boolean;
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

// פונקציית עזר גלובלית לפתיחת חלון אישור מעוצב בכל מקום באפליקציה
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
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

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
      const isError =
        text.includes('שגיאה') ||
        text.includes('נכשל') ||
        text.includes('לא ניתן') ||
        text.includes('אין כרגע') ||
        text.includes('חובה') ||
        text.includes('אסור');
      const isSuccess =
        text.includes('בהצלחה') ||
        text.includes('אושר') ||
        text.includes('בוטל') ||
        text.includes('נשמר') ||
        text.includes('הועתק') ||
        text.includes('עודכן');

      setAlertState({
        isOpen: true,
        message: text,
        type: isError ? 'error' : isSuccess ? 'success' : 'info',
      });
    };

    const handleConfirm = (event: Event) => {
      const detail = (event as CustomEvent<Omit<ConfirmState, 'isOpen'>>).detail;
      setConfirmState({
        isOpen: true,
        ...detail,
      });
    };

    window.addEventListener('smartqueue-alert', handleAlert);
    window.addEventListener('smartqueue-confirm', handleConfirm);

    return () => {
      window.removeEventListener('smartqueue-alert', handleAlert);
      window.removeEventListener('smartqueue-confirm', handleConfirm);
    };
  }, []);

  const handleConfirmChoice = (choice: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(choice);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: undefined }));
  };

  const alertStyles = {
    success: {
      icon: '✅',
      title: 'הפעולה הושלמה בהצלחה',
      badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    },
    error: {
      icon: '⚠️',
      title: 'שים לב',
      badgeBg: 'bg-red-50 text-red-600 border-red-200',
      btnBg: 'bg-red-600 hover:bg-red-700',
    },
    info: {
      icon: '✨',
      title: 'הודעת מערכת',
      badgeBg: 'bg-blue-50 text-blue-600 border-blue-200',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
    },
  }[alertState.type];

  return (
    <>
      {/* 1. חלונית התראה מעוצבת (מחליפה את window.alert) */}
      {alertState.isOpen && (
        <div
          dir="rtl"
          style={{ zIndex: 99999 }}
          className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-7 text-center transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl border flex items-center justify-center text-3xl shadow-sm ${alertStyles.badgeBg}`}
            >
              {alertStyles.icon}
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">{alertStyles.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
              {alertState.message}
            </p>

            <button
              type="button"
              onClick={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
              className={`w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm shadow-lg transition-all cursor-pointer ${alertStyles.btnBg}`}
            >
              הבנתי, אישור
            </button>
          </div>
        </div>
      )}

      {/* 2. חלונית אישור דו-כפתורית מעוצבת (מחליפה את window.confirm) */}
      {confirmState.isOpen && (
        <div
          dir="rtl"
          style={{ zIndex: 99999 }}
          className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => handleConfirmChoice(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-7 text-center transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-2xl border flex items-center justify-center text-3xl shadow-sm ${
                confirmState.isDanger
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {confirmState.isDanger ? '🗑️' : '❓'}
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">{confirmState.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 whitespace-pre-line">
              {confirmState.message}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all cursor-pointer"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`py-3 px-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all cursor-pointer ${
                  confirmState.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
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
