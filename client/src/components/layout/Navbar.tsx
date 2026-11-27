import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { registerBiometricPasskey, getBiometricCapability, BiometricCapability } from '../../utils/passkeyHelper';
import { SmartQueueLogo } from '../common/SmartQueueLogo';
import { SmartQueueAssistant } from '../common/SmartQueueAssistant';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
    const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
    const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
    const [biometricCap, setBiometricCap] = useState<BiometricCapability>({
        supported: false,
        label: '',
    });

    useEffect(() => {
        getBiometricCapability().then(setBiometricCap);
    }, []);


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
        } catch {
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
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center gap-2">
                        {/* צד ימין: תפריט קווים (במובייל תמיד, ובמחשב למשתמש מחובר) + לוגו המותג */}
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDrawerOpen(true);
                                    setDeleteStep('NONE');
                                    setSmsCode('');
                                }}
                                className={`${user ? 'flex' : 'flex md:hidden'} items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.95] transition-all bg-white shadow-sm cursor-pointer shrink-0`}
                                aria-label="פתח תפריט"
                            >
                                <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <Link
                                to={user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'BUSINESS_OWNER' ? '/business-home' : '/'}
                                className="flex items-center hover:opacity-95 transition-opacity truncate"
                            >
                                <SmartQueueLogo size="sm" />
                            </Link>
                        </div>

                        {/* צד שמאל: במחשב לאורח כפתורים פתוחים, ובמובייל נקי לגמרי */}
                        <div className="flex items-center gap-3 sm:gap-5 text-sm font-medium shrink-0">
                            {!user ? (
                                <div className="hidden md:flex items-center gap-4">
                                    <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
                                        דף הבית
                                    </Link>
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
                            ) : (
                                <>
                                    {user.role !== 'SUPER_ADMIN' && (
                                        <Link
                                            to={user.role === 'BUSINESS_OWNER' ? '/business-home' : '/'}
                                            className="hidden sm:inline-block text-gray-600 hover:text-blue-600 transition-colors"
                                        >
                                            דף הבית
                                        </Link>
                                    )}

                                    {user.role === 'SUPER_ADMIN' && (
                                        <Link
                                            to="/admin"
                                            className="inline-flex items-center gap-1.5 text-indigo-700 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl bg-indigo-50 transition-all font-black text-xs sm:text-sm"
                                        >
                                            <span>ניהול מערכת</span>
                                        </Link>
                                    )}

                                    {user.role === 'BUSINESS_OWNER' && (
                                        <Link
                                            to="/dashboard"
                                            className="hidden sm:inline-block text-blue-700 hover:bg-blue-100/70 px-3 py-1.5 rounded-xl bg-blue-50/80 transition-all font-bold"
                                        >
                                            ניהול יומן
                                        </Link>
                                    )}
                                </>
                            )}
                            {user && user.role !== 'SUPER_ADMIN' && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={handleToggleNotifications}
                                        className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.95] transition-all bg-white shadow-sm cursor-pointer"
                                        title="התראות ותזכורות"
                                    >
                                        <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {isNotifOpen && (
                                        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-black text-gray-800">התראות ותזכורות</span>
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
                        </div>
                    </div>
                </div>
            </nav>
            <div className={`fixed inset-0 z-50 transition-all duration-300 ${isDrawerOpen ? 'visible' : 'invisible'}`} dir="rtl">
                <div
                    className={`absolute inset-0 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsDrawerOpen(false)}
                />

                <div
                    className={`absolute right-0 top-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl transition-transform duration-300 border-l border-gray-100 flex flex-col justify-between p-5 overflow-y-auto ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                            {user ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-black shadow-md ${user.role === 'SUPER_ADMIN'
                                                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/20'
                                                : 'bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-blue-500/20'
                                            }`}
                                    >
                                        {user.role === 'SUPER_ADMIN' ? 'ADMIN' : user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold">
                                            {user.role === 'SUPER_ADMIN'
                                                ? 'מנהל מערכת ראשי'
                                                : user.role === 'BUSINESS_OWNER'
                                                    ? 'ניהול עסק'
                                                    : 'שלום ומבורך'}
                                        </p>
                                        <p className="text-base font-black text-gray-800 truncate max-w-[155px]">{user.name}</p>
                                    </div>
                                </div>
                            ) : (
                                <SmartQueueLogo size="sm" />
                            )}

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
                                {!user && (
                                    <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/login');
                                            }}
                                            className="py-2.5 px-3 rounded-xl text-xs font-black text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer"
                                        >
                                            התחברות
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/register');
                                            }}
                                            className="py-2.5 px-3 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                                        >
                                            הרשמה
                                        </button>
                                    </div>
                                )}

                                {user?.role !== 'SUPER_ADMIN' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            navigate(user?.role === 'BUSINESS_OWNER' ? '/business-home' : '/');
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <svg className="w-4 h-4 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        <span>דף הבית</span>
                                    </button>
                                )}
                                {user?.role === 'CLIENT' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/my-appointments');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <path d="M16 2v4M8 2v4M3 10h18" />
                                            </svg>
                                            <span>התורים שלי</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/favorites');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                            <span>העסקים המועדפים שלי</span>
                                        </button>

                                        <div className="flex flex-col gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setIsShareOpen(!isShareOpen)}
                                                className="w-full text-right px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="18" cy="5" r="3" />
                                                        <circle cx="6" cy="12" r="3" />
                                                        <circle cx="18" cy="19" r="3" />
                                                        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                                                    </svg>
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
                                                        <span>SMS</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                {user?.role === 'BUSINESS_OWNER' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/dashboard');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                            </svg>
                                            <span>לוח בקרה וניהול יומן</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsDrawerOpen(false);
                                                navigate('/business-invoices');
                                            }}
                                            className="w-full text-right px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                        >
                                            <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>הפקת חשבוניות וקבלות</span>
                                        </button>
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
                                            <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <path d="M16 2v4M8 2v4M3 10h18" />
                                            </svg>
                                            <span>סנכרון ליומן Google</span>
                                        </button>
                                    </>
                                )}

                                {user?.role === 'SUPER_ADMIN' && (
                                    <button
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            navigate('/admin');
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-black text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        <span>מרכז שליטה ראשי</span>
                                    </button>
                                )}
                                {user?.role !== 'SUPER_ADMIN' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            setIsAiOpen(true);
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        <span>עוזר חכם (AI)</span>
                                    </button>
                                )}
                                {user && biometricCap.supported && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const msg = await registerBiometricPasskey();
                                                alert(msg);
                                                setIsDrawerOpen(false);
                                            } catch (err: any) {
                                                alert(err?.message || 'לא ניתן היה להגדיר זיהוי ביומטרי במכשיר זה.');
                                            }
                                        }}
                                        className="w-full text-right px-4 py-3 text-sm font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                    >
                                        <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                        </svg>
                                        <span>הפעל {biometricCap.label}</span>
                                    </button>
                                )}


                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        navigate('/about');
                                    }}
                                    className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                >
                                    <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
                                    </svg>
                                    <span>היכרות עם המערכת</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        navigate('/privacy');
                                    }}
                                    className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                                >
                                    <svg className="w-4 h-4 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    <span>מדיניות פרטיות ותנאי שימוש</span>
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
                                    {isSendingSms ? 'שולח קוד באסמס...' : 'שלח קוד אימות ל-SMS'}
                                </button>
                                <button onClick={() => setDeleteStep('NONE')} className="w-full mt-3 text-xs text-gray-400 hover:underline">
                                    ביטול וחזרה
                                </button>
                            </div>
                        )}

                        {deleteStep === 'SMS_SENT' && (
                            <div className="p-2 text-center animate-fade-in">
                                <p className="text-xs font-bold text-green-600 mb-1">קוד האימות נשלח בהצלחה!</p>
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

                    {user && deleteStep === 'NONE' && (
                        <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col gap-1.5">
                            <button
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    navigate('/profile');
                                }}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                            >
                                <svg className="w-4 h-4 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                                </svg>
                                <span>הגדרות</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full text-right px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-3 group cursor-pointer"
                            >
                                <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>התנתק מהמערכת</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <SmartQueueAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
        </>
    );
};

export default Navbar;
