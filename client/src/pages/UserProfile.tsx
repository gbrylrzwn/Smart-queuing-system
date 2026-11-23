import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

const UserProfile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // סטייטים לניהול מחיקת חשבון (הועברו מה-Navbar להגדרות)
  const [deleteStep, setDeleteStep] = useState<'NONE' | 'ACCOUNT_CONFIRM' | 'SMS_SENT'>('NONE');
  const [smsCode, setSmsCode] = useState<string>('');
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [confirmCancelBusiness, setConfirmCancelBusiness] = useState<boolean>(false);
  const [cancelingBusiness, setCancelingBusiness] = useState<boolean>(false);

  const handleCancelBusiness = async () => {
    try {
      setCancelingBusiness(true);
      await axiosClient.delete('/business/delete-my-business');
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בביטול רישום העסק. אנא נסה שנית.');
    } finally {
      setCancelingBusiness(false);
    }
  };


  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await axiosClient.put('/auth/update-profile', { name, phone });
      if (response.data.user) {
        updateUser(response.data.user, response.data.token);
      }
      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'נכשלנו בעדכון הפרטים. אנא נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSmsVerification = async () => {
    setIsSendingSms(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setDeleteStep('SMS_SENT');
    } catch (err) {
      alert('שגיאה בשליחת ה-SMS. נסה שנית.');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (smsCode !== '1234') {
      alert('קוד ה-SMS שהזנת אינו תקין. אנא נסה שנית.');
      return;
    }

    try {
      setDeletingAccount(true);
      await axiosClient.delete('/auth/delete-my-account');
      logout();
      navigate('/register');
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו במחיקת החשבון.');
    } finally {
      setDeletingAccount(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col items-center z-10 space-y-6">
      <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-right p-8 relative" dir="rtl">
  <button
    type="button"
    onClick={() => navigate('/')}
    className="absolute top-5 left-5 w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm font-black border border-gray-100 transition-all cursor-pointer"
    title="סגור וחזור לדף הבית"
  >
    ✕
  </button>

          <div className="flex flex-col items-center border-b border-gray-50 pb-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 mb-3">
              {name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-black text-gray-800 text-center">הגדרות ופרטי חשבון</h2>
            <p className="text-xs text-gray-400 font-bold mt-1 text-center">עריכת פרטים אישיים וניהול החשבון</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-bold text-right border bg-red-50 text-red-600 border-red-100" dir="rtl">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5 text-right" dir="rtl">
            <div className="text-right">
              <label className="block text-xs font-bold text-gray-500 mb-1.5 text-right">שם מלא</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-800 text-right bg-gray-50/50"
                required
              />
            </div>

            <div className="text-right">
              <label className="block text-xs font-bold text-gray-500 mb-1.5 text-right">מספר טלפון נייד</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-gray-800 text-right bg-gray-50/50"
                required
              />
            </div>

            <div className="text-right opacity-60">
              <label className="block text-xs font-bold text-gray-500 mb-1.5 text-right">כתובת אימייל (לא ניתן לשינוי)</label>
              <input
                type="email"
                value={email}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 text-right bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-6 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm active:scale-[0.98] transition-all text-center cursor-pointer"
              >
                {loading ? 'שומר שינויים...' : 'אישור ועדכון'}
              </button>
              
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex-1 py-3 px-6 text-sm font-bold rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 active:scale-[0.98] transition-all text-center cursor-pointer"
              >
                ביטול
              </button>
            </div>
          </form>

          {/* אזור מחיקת חשבון (הועבר מהתפריט הצדדי להגדרות) */}
          <div className="mt-10 pt-6 border-t border-gray-100">
            {deleteStep === 'NONE' && (
              <div className="flex items-center justify-between bg-red-50/50 p-4 rounded-2xl border border-red-100">
                <div>
                  <h4 className="text-xs font-black text-red-700">ביטול הרשמה ומחיקת חשבון</h4>
                  <p className="text-[11px] text-red-500/80 mt-0.5">פעולה זו תסיר את החשבון והיסטוריית התורים לצמיתות.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteStep('ACCOUNT_CONFIRM')}
                  className="px-4 py-2 bg-white hover:bg-red-600 text-red-600 hover:text-white border border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  מחק חשבון
                </button>
              </div>
            )}

            {deleteStep === 'ACCOUNT_CONFIRM' && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                <p className="text-xs font-bold text-gray-800 mb-3 leading-relaxed">
                  האם אתה בטוח? מחיקת החשבון אינה ניתנת לשחזור.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={triggerSmsVerification}
                    disabled={isSendingSms}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {isSendingSms ? 'שולח קוד...' : '💬 שלח קוד אימות ל-SMS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep('NONE')}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 font-bold text-xs rounded-xl hover:bg-gray-50 cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'SMS_SENT' && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                <p className="text-xs font-bold text-emerald-600 mb-1">💬 קוד האימות נשלח בהצלחה!</p>
                <p className="text-[10px] text-gray-400 mb-3">(לצורך בדיקה הזן: <span className="font-bold">1234</span>)</p>
                
                <input
                  type="text"
                  maxLength={4}
                  placeholder="הזן 4 ספרות..."
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  className="w-40 text-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-3 tracking-widest mx-auto block"
                />
                
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleConfirmDeleteAccount}
                    disabled={smsCode.length !== 4 || deletingAccount}
                    className={`px-4 py-2 font-bold text-xs rounded-xl text-white shadow-sm transition-all ${
                      smsCode.length === 4 && !deletingAccount ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {deletingAccount ? 'מוחק...' : 'אשר מחיקה סופית'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep('NONE')}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 font-bold text-xs rounded-xl hover:bg-gray-50 cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
                    {/* אזור ביטול רישום עסק (מוצג לבעלי עסקים בלבד בתוך ההגדרות) */}
                    {user?.role === 'BUSINESS_OWNER' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {!confirmCancelBusiness ? (
                <div className="flex items-center justify-between bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                  <div>
                    <h4 className="text-xs font-black text-amber-800">ביטול רישום העסק במערכת</h4>
                    <p className="text-[11px] text-amber-600/90 mt-0.5">פעולה זו תמחק את פרופיל העסק, השירותים והיומן לצמיתות.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelBusiness(true)}
                    className="px-4 py-2 bg-white hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    בטל רישום עסק
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                  <p className="text-xs font-bold text-gray-800 mb-3">
                    האם אתה בטוח שברצונך לבטל את רישום העסק ולמחוק את היומן לצמיתות?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleCancelBusiness}
                      disabled={cancelingBusiness}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {cancelingBusiness ? 'מבטל רישום...' : 'כן, בטל רישום עסק'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelBusiness(false)}
                      className="px-4 py-2 bg-white text-gray-600 border border-gray-200 font-bold text-xs rounded-xl hover:bg-gray-50 cursor-pointer"
                    >
                      חזור
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 text-2xl shadow-sm mb-4">
              ✓
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1 text-center">שינוי פרטים אישיים</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6 text-center">הפרטים עודכנו בהצלחה במערכת.</p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                window.location.href = '/';
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-sm font-bold rounded-xl transition-all shadow-md text-center cursor-pointer"
            >
              אישור
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
