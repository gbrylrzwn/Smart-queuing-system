import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { registerBiometricPasskey } from '../../utils/passkeyHelper';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isBusinessPage = /^\/business\/\d+/.test(location.pathname);

    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

    const [deleteStep, setDeleteStep] = useState<'NONE' | 'BUSINESS_CONFIRM' | 'SMS_SENT' | 'ACCOUNT_CONFIRM'>('NONE');
    const [smsCode, setSmsCode] = useState<string>('');
    const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
    const [loadingAction, setLoadingAction] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const isFirstLoadRef = useRef<boolean>(true);
    const prevCountRef = useRef<number>(0);

    useEffect(() => {
        if (user?.role !== 'CLIENT') return;

        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            prevCountRef.current = unreadCount;
            return;
        }

        if (unreadCount > prevCountRef.current) {
            try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } catch { }
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount, user]);

    useEffect(() => {
        if (!user || user.role === 'SUPER_ADMIN') {
            setNotifications([]);
            return;
        }

        const fetchNotifications = async () => {
            try {
                const res = await axiosClient.get('/business/notifications/my');
                setNotifications(res.data.notifications || []);
            } catch { }
        };

        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 15000);
        return () => clearInterval(intervalId);
    }, [user]);

    const handleToggleNotifications = async () => {
        const nextState = !isNotifOpen;
        setIsNotifOpen(nextState);
        if (nextState && unreadCount > 0) {
            try {
                await axiosClient.put('/business/notifications/read-all');
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            } catch { }
        }
    };

    const handleLogout = () => {
        setIsDrawerOpen(false);
        logout();
        navigate('/login');
    };

    const handleCancelBusiness = async () => {
        try {
            setLoadingAction(true);
            await axiosClient.delete('/business/delete-my-business');
            setIsDrawerOpen(false);
            setDeleteStep('NONE');
            window.location.href = '/dashboard';
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בביטול רישום העסק. אנא נסה שנית.');
        } finally {
            setLoadingAction(false);
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
            setLoadingAction(true);
            await axiosClient.delete('/auth/delete-my-account');
            setIsDrawerOpen(false);
            setDeleteStep('NONE');
            logout();
            navigate('/register');
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו במחיקת החשבון.');
        } finally {
            setLoadingAction(false);
        }
    };

    return (
        <>
            <nav className="bg-white shadow-sm border-b border-gray-100 relative z-40" dir="rtl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <Link
                                to={user?.role === 'SUPER_ADMIN' ? '/admin' : '/'}
                                className="text-xl font-black text-blue-600 tracking-tight"
                            >
                                SmartQueue 💈
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 text-sm font-medium">
                            {user?.role !== 'SUPER_ADMIN' && (
                                <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                                    דף הבית
                                </Link>
                            )}

                            {user ? (
                                <div className="flex items-center gap-3">
                                    {user.role === 'SUPER_ADMIN' && (
                                        <Link
                                            to="/admin"
                                            className="text-indigo-700 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl bg-indigo-50 transition-all font-black"
                                        >
                                            👑 ניהול מערכת (Admin)
                                        </Link>
                                    )}

                                    {user.role === 'BUSINESS_OWNER' && (
                                        <Link
                                            to="/dashboard"
                                            className="text-blue-700 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl bg-blue-50/80 transition-all font-bold"
                                        >
                                            לוח בקרה (מנהל)
                                        </Link>
                                    )}

                                    {user.role !== 'SUPER_ADMIN' && (
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={handleToggleNotifications}
                                                className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.95] transition-all bg-white shadow-sm cursor-pointer"
                                                title="התראות ותזכורות"
                                            >
                                                <span className="text-lg">🔔</span>
                                                {unreadCount > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </button>

                                            {isNotifOpen && (
                                                <div
                                                    className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-right"
                                                    dir="rtl"
                                                >
                                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                        <span className="text-xs font-black text-gray-800">🔔 התראות ותזכורות</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsNotifOpen(false)}
                                                            className="text-xs text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                                                        {notifications.length === 0 ? (
                                                            <p className="text-xs text-gray-400 text-center py-8 font-medium">אין התראות חדשות כרגע.</p>
                                                        ) : (
                                                            notifications.map((n: any) => (
                                                                <div key={n.id} className="p-3.5 hover:bg-gray-50/70 transition-colors">
                                                                    <p className="text-xs font-black text-gray-900">{n.title}</p>
                                                                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                                                                    <span className="text-[9px] text-gray-400 block mt-1">
                                                                        {new Date(n.createdAt).toLocaleString('he-IL', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            day: '2-digit',
                                                                            month: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDrawerOpen(true);
                                            setDeleteStep('NONE');
                                            setSmsCode('');
                                        }}
                                        className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.95] transition-all bg-white shadow-sm cursor-pointer"
                                    >
                                        <span className="text-lg text-gray-600">☰</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link to="/login" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-xl transition-colors">
                                        התחברות
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                                    >
                                        הרשמה
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div className={`fixed inset-0 z-50 transition-all duration-300 ${isDrawerOpen ? 'visible' : 'invisible'}`} dir="rtl">
                <div
                    className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                    onClick={() => setIsDrawerOpen(false)}
                />

                <div
                    className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 border-r border-gray-50 flex flex-col justify-between p-6 ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-md ${user?.role === 'SUPER_ADMIN'
                                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/20'
                                        : 'bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-blue-500/20'
                                        }`}
                                >
                                    {user?.role === 'SUPER_ADMIN' ? '👑' : user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold">
                                        {user?.role === 'SUPER_ADMIN'
                                            ? 'מנהל מערכת ראשי'
                                            : user?.role === 'BUSINESS_OWNER'
                                                ? 'ניהול עסק'
                                                : 'שלום ומבורך'}
                                    </p>
                                    <p className="text-base font-black text-gray-800 truncate max-w-[150px]">{user?.name}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-8 h-8 rounded-xl hover:bg-gray-50 text-gray-400 flex items-center justify-center text-sm font-bold border border-gray-100 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {deleteStep === 'NONE' && (
                            <div className="flex flex-col gap-1.5 animate-fade-in">
                                {user?.role === 'CLIENT' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/my-appointments');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <span className="text-base group-hover:scale-110 transition-transform">📅</span>
                                            <span>התורים שלי</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/favorites');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <span className="text-base group-hover:scale-110 transition-transform">❤️</span>
                                            <span>העסקים המועדפים שלי</span>
                                        </button>
                                        <div className="flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsShareOpen(!isShareOpen)}
                                                className="w-full text-right px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-base group-hover:scale-110 transition-transform">📲</span>
                                                    <span>שיתוף עם חבר</span>
                                                </div>
                                                <span className="text-xs">{isShareOpen ? '▲' : '▼'}</span>
                                            </button>

                                            {isShareOpen && (
                                                <div className="grid grid-cols-3 gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const text = `היי! ממליץ/ה בחום על SmartQueue — אפליקציה נוחה ומהירה לקביעת תורים בקליק אחד:\n${window.location.origin}`;
                                                            const waBase = 'https://' + 'wa.me/';
                                                            window.open(waBase + '?text=' + encodeURIComponent(text), '_blank');
                                                            setIsShareOpen(false);
                                                            setIsDrawerOpen(false);
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg border border-gray-200 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <span className="text-base">💬</span>
                                                        <span>WhatsApp</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const subject = 'הזמנה להצטרף ל-SmartQueue לקביעת תורים';
                                                            const body = `היי!\nממליץ/ה בחום על SmartQueue — אפליקציה נוחה ומהירה לקביעת תורים בקליק אחד:\n${window.location.origin}`;
                                                            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                                            setIsShareOpen(false);
                                                            setIsDrawerOpen(false);
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-white hover:bg-blue-50 text-blue-700 rounded-lg border border-gray-200 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <span className="text-base">✉️</span>
                                                        <span>אימייל</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const text = `היי! ממליץ/ה בחום על SmartQueue — אפליקציה לקביעת תורים בקליק אחד: ${window.location.origin}`;
                                                            window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
                                                            setIsShareOpen(false);
                                                            setIsDrawerOpen(false);
                                                        }}
                                                        className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-white hover:bg-purple-50 text-purple-700 rounded-lg border border-gray-200 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <span className="text-base">📱</span>
                                                        <span>SMS</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                    </>
                                )}

                                {user?.role === 'BUSINESS_OWNER' && (
                                    <button
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            navigate('/dashboard');
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <span className="text-base group-hover:scale-110 transition-transform">📊</span>
                                        <span>לוח בקרה וניהול יומן</span>
                                    </button>
                                )}

                                {user?.role === 'SUPER_ADMIN' && (
                                    <button
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            navigate('/admin');
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-black text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <span className="text-base group-hover:scale-110 transition-transform">👑</span>
                                        <span>מרכז שליטה ראשי</span>
                                    </button>

                                )}


                                {user?.role === 'BUSINESS_OWNER' && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await axiosClient.get('/google-calendar/auth-url');
                                                if (res.data?.url) {
                                                    setIsDrawerOpen(false);
                                                    window.location.href = res.data.url;
                                                }
                                            } catch {
                                                alert('שגיאה בפתיחת חלון ההתחברות ליומן Google. אנא ודא שהשרת פועל.');
                                            }
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <span className="text-base group-hover:scale-110 transition-transform">📅</span>
                                        <span>סנכרון ליומן Google</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const msg = await registerBiometricPasskey();
                                            alert(msg);
                                            setIsDrawerOpen(false);
                                        } catch (err: any) {
                                            if (err?.name !== 'NotAllowedError') {
                                                alert(err?.response?.data?.error || 'לא ניתן היה להגדיר זיהוי ביומטרי במכשיר זה.');
                                            }
                                        }
                                    }}
                                    className="w-full text-right px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                >
                                    <span className="text-base group-hover:scale-110 transition-transform">👆</span>
                                    <span>הפעל טביעת אצבע / זיהוי פנים</span>
                                </button>




                            </div>
                        )}
                        {deleteStep === 'BUSINESS_CONFIRM' && (
                            <div className="p-2 text-center animate-fade-in">
                                <p className="text-sm font-bold text-gray-800 mb-3 leading-relaxed">
                                    האם לבטל את רישום העסק והיומן לצמיתות?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancelBusiness}
                                        disabled={loadingAction}
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded-xl transition-all"
                                    >
                                        כן, בטל
                                    </button>
                                    <button
                                        onClick={() => setDeleteStep('NONE')}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 rounded-xl transition-all border border-gray-200"
                                    >
                                        חזור
                                    </button>
                                </div>
                            </div>
                        )}

                        {deleteStep === 'ACCOUNT_CONFIRM' && (
                            <div className="p-2 text-center animate-fade-in">
                                <p className="text-sm font-bold text-gray-800 mb-4 leading-relaxed">
                                    מחיקת החשבון תסיר את כל המידע והתורים שלך לצמיתות ולא ניתנת לשחזור.
                                </p>
                                <button
                                    onClick={triggerSmsVerification}
                                    disabled={isSendingSms}
                                    className="w-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
                                >
                                    {isSendingSms ? 'שולח קוד באסמס...' : '💬 שלח קוד אימות ל-SMS'}
                                </button>
                                <button onClick={() => setDeleteStep('NONE')} className="w-full mt-3 text-xs text-gray-400 hover:underline">
                                    ביטול וחזרה
                                </button>
                            </div>
                        )}

                        {deleteStep === 'SMS_SENT' && (
                            <div className="p-2 text-center animate-fade-in">
                                <p className="text-xs font-bold text-green-600 mb-1">💬 קוד האימות נשלח בהצלחה!</p>
                                <p className="text-[10px] text-gray-400 mb-4">
                                    (לצורך בדיקה הזן: <span className="font-bold">1234</span>)
                                </p>

                                <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="הזן 4 ספרות..."
                                    value={smsCode}
                                    onChange={(e) => setSmsCode(e.target.value)}
                                    className="w-full text-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 tracking-widest"
                                />

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleConfirmDeleteAccount}
                                        disabled={smsCode.length !== 4 || loadingAction}
                                        className={`flex-1 font-bold text-xs py-2 rounded-xl text-white shadow-sm transition-all ${smsCode.length === 4 && !loadingAction
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-300 cursor-not-allowed'
                                            }`}
                                    >
                                        {loadingAction ? 'מוחק...' : 'מחק חשבון סופית'}
                                    </button>
                                    <button
                                        onClick={() => setDeleteStep('NONE')}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 rounded-xl transition-all border border-gray-200"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {deleteStep === 'NONE' && (
                        <div className="border-t border-gray-100 pt-4 flex flex-col gap-1.5">
                            <button
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    navigate('/profile');
                                }}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                            >
                                <span className="text-base group-hover:scale-110 transition-transform">⚙️</span>
                                <span>הגדרות</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                            >
                                <span className="text-base group-hover:scale-110 transition-transform">🚪</span>
                                <span>התנתק מהמערכת</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Navbar;
