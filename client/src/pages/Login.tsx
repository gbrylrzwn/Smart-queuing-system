import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { loginWithBiometricPasskey } from '../utils/passkeyHelper';
import { SmartQueueLogo } from '../components/common/SmartQueueLogo';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectPath = searchParams.get('redirect');
    const { login } = useAuth();

    const [authMode, setAuthMode] = useState<'OTP' | 'PASSWORD' | 'FORGOT'>(redirectPath ? 'OTP' : 'PASSWORD');

    const [otpName, setOtpName] = useState<string>('');
    const [otpPhone, setOtpPhone] = useState<string>('');
    const [otpCode, setOtpCode] = useState<string>('');
    const [otpSent, setOtpSent] = useState<boolean>(false);

    const [formData, setFormData] = useState({ phone: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [isNotRegistered, setIsNotRegistered] = useState<boolean>(false);
    const [resetIdentifier, setResetIdentifier] = useState<string>('');
    const [resetTokenKey, setResetTokenKey] = useState<string>('');
    const [resetCode, setResetCode] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
    const [resetStep, setResetStep] = useState<1 | 2>(1);

    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const navigateAfterLogin = (user: any) => {
        setTimeout(() => {
            if (redirectPath && redirectPath.startsWith('/')) {
                navigate(redirectPath, { replace: true });
            } else if (user.role === 'SUPER_ADMIN') {
                navigate('/admin', { replace: true });
            } else if (user.role === 'BUSINESS_OWNER') {
                navigate('/business-home', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }, 0);
    };
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfoMessage(null);
        setLoading(true);
        try {
            const res = await axiosClient.post('/auth/send-otp', {
                name: otpName,
                phone: otpPhone
            });
            setOtpSent(true);
            setInfoMessage(res.data?.message || 'קוד אימות נשלח אליך ב-SMS.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'נכשלנו בשליחת קוד האימות.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await axiosClient.post('/auth/verify-otp', {
                phone: otpPhone,
                code: otpCode
            });
            const { user, token } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            login(user, token);
            navigateAfterLogin(user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'קוד האימות שגוי או שפג תוקפו.');
        } finally {
            setLoading(false);
        }
    };
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsNotRegistered(false);
        setLoading(true);
        try {
            const response = await axiosClient.post('/auth/login', formData);
            const { user, token } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            login(user, token);
            navigateAfterLogin(user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'פרטי ההתחברות שגויים. נסה שנית.');
            setIsNotRegistered(Boolean(err.response?.data?.notRegistered));
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfoMessage(null);
        setLoading(true);
        try {
            const res = await axiosClient.post('/auth/forgot-password', { identifier: resetIdentifier });
            setResetTokenKey(res.data.resetTokenKey);
            setResetStep(2);
            setInfoMessage(res.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'לא ניתן היה לשלוח קוד איפוס.');
        } finally {
            setLoading(false);
        }
    };
    const handleConfirmPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (newPassword !== confirmNewPassword) {
            setError('הסיסמאות שהוזנו אינן תואמות.');
            return;
        }
        setLoading(true);
        try {
            const res = await axiosClient.post('/auth/reset-password', {
                resetTokenKey,
                code: resetCode,
                newPassword,
            });
            setAuthMode('PASSWORD');
            setResetStep(1);
            setResetCode('');
            setNewPassword('');
            setConfirmNewPassword('');
            setInfoMessage(res.data.message || 'הסיסמה אופסה בהצלחה!');
        } catch (err: any) {
            setError(err.response?.data?.error || 'קוד האימות שגוי או שפג תוקפו.');
        } finally {
            setLoading(false);
        }
    };

    const registerUrl = redirectPath
        ? `/register?redirect=${encodeURIComponent(redirectPath)}`
        : '/register';
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col font-sans" dir="rtl">
                <Navbar />
    
                <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div className="max-w-md w-full bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50">
                        <div className="flex justify-center mb-4">
                            <SmartQueueLogo size="md" />
                        </div>
    
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                {authMode === 'OTP'
                                    ? 'כניסה מהירה לקביעת תור'
                                    : authMode === 'FORGOT'
                                    ? 'שחזור ואיפוס סיסמה'
                                    : 'ברוך הבא למערכת'}
                            </h2>
                            {authMode === 'PASSWORD' && (
                                <p className="mt-1.5 text-xs text-gray-500 font-medium">
                                    עדיין אין לך חשבון?{' '}
                                    <Link to={registerUrl} className="font-bold text-blue-600 hover:text-blue-500 underline">
                                        צור חשבון חדש בחינם
                                    </Link>
                                </p>
                            )}
                        </div>
    
                        {error && (
                            <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-5 text-xs font-bold space-y-1.5">
                                <div>{error}</div>
                                {isNotRegistered && (
                                    <div>
                                        <Link to={registerUrl} className="inline-block underline font-black text-blue-700 hover:text-blue-900">
                                            לחץ כאן להרשמה מהירה למערכת ←
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
    
                        {infoMessage && (
                            <div className="bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 px-4 py-3 rounded-xl mb-5 text-xs font-bold">
                                {infoMessage}
                            </div>
                        )}
                        {authMode === 'OTP' ? (
                        <div className="space-y-4">
                            {!otpSent ? (
                                <form className="space-y-4" onSubmit={handleSendOtp}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">שם מלא</label>
                                        <input
                                            type="text"
                                            required
                                            value={otpName}
                                            onChange={(e) => setOtpName(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">מספר טלפון נייד</label>
                                        <input
                                            type="tel"
                                            required
                                            value={otpPhone}
                                            onChange={(e) => setOtpPhone(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                            placeholder="050-0000000"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-4 text-sm font-black rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md transition-all cursor-pointer"
                                    >
                                        {loading ? 'שולח קוד...' : 'שלח קוד אימות ל-SMS ←'}
                                    </button>
                                </form>
                            ) : (
                                <form className="space-y-4" onSubmit={handleVerifyOtp}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">הזן קוד אימות (4 ספרות)</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            required
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full text-center tracking-[0.5em] px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-lg font-black"
                                            placeholder="••••"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otpCode.length !== 4}
                                        className="w-full py-3 px-4 text-sm font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 shadow-md transition-all cursor-pointer"
                                    >
                                        {loading ? 'מאמת קוד...' : 'אמת והמשך לקביעת תור ←'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setOtpSent(false); setOtpCode(''); setError(null); setInfoMessage(null); }}
                                        className="w-full text-xs text-gray-500 hover:underline font-bold pt-1 cursor-pointer"
                                    >
                                        החלף מספר טלפון או שלח קוד מחדש
                                    </button>
                                </form>
                            )}

                            <div className="pt-3 border-t border-gray-100 text-center">
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('PASSWORD'); setError(null); setInfoMessage(null); }}
                                    className="text-xs font-bold text-gray-500 hover:text-blue-600 underline cursor-pointer"
                                >
                                    יש לך כבר חשבון קבוע? התחבר עם סיסמה
                                </button>
                            </div>
                        </div>
                    ) : authMode === 'FORGOT' ? (
                        <div className="space-y-4">
                            {resetStep === 1 ? (
                                <form className="space-y-4" onSubmit={handleRequestPasswordReset}>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        הזן את מספר הטלפון הנייד או כתובת האימייל שאיתם נרשמת, ונשלח אליך קוד אימות חד-פעמי בן 6 ספרות.
                                    </p>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">טלפון נייד או אימייל</label>
                                        <input
                                            type="text"
                                            required
                                            value={resetIdentifier}
                                            onChange={(e) => setResetIdentifier(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                            placeholder="050-0000000 או name@email.com"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 px-4 text-sm font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
                                    >
                                        {loading ? 'שולח קוד אימות...' : 'שלח קוד אימות לאיפוס ←'}
                                    </button>
                                </form>
                            ) : (
                                <form className="space-y-4" onSubmit={handleConfirmPasswordReset}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">קוד אימות (6 ספרות)</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            required
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="w-full text-center tracking-[0.4em] px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-lg font-black"
                                            placeholder="••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">סיסמה חדשה (לפחות 6 תווים)</label>
                                        <input
                                            type="password"
                                            minLength={6}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">אימות סיסמה חדשה</label>
                                        <input
                                            type="password"
                                            minLength={6}
                                            required
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || resetCode.length !== 6}
                                        className="w-full py-3 px-4 text-sm font-black rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 shadow-md transition-all cursor-pointer"
                                    >
                                        {loading ? 'מעדכן סיסמה...' : 'שמור סיסמה חדשה והתחבר ←'}
                                    </button>
                                </form>
                            )}

                            <div className="pt-3 border-t border-gray-100 text-center">
                                <button
                                    type="button"
                                    onClick={() => { setAuthMode('PASSWORD'); setResetStep(1); setError(null); setInfoMessage(null); }}
                                    className="text-xs font-bold text-gray-500 hover:text-blue-600 underline cursor-pointer"
                                >
                                    חזרה למסך ההתחברות
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">מספר טלפון (או אימייל)</label>
                                <input
                                    name="phone"
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                    placeholder="0501234567"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-gray-700">סיסמה</label>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('FORGOT'); setResetStep(1); setError(null); setInfoMessage(null); }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                    >
                                        שכחתי סיסמה?
                                    </button>
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 text-sm font-black rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all cursor-pointer"
                            >
                                {loading ? 'מתחבר למערכת...' : 'התחברות מאובטחת ←'}
                            </button>
                        </form>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                                try {
                                    setError(null);
                                    setLoading(true);
                                    const data = await loginWithBiometricPasskey();
                                    if (data?.token && data?.user) {
                                        login(data.user, data.token);
                                        navigateAfterLogin(data.user);
                                    }
                                } catch (err: any) {
                                    if (err?.name !== 'NotAllowedError') {
                                        setError(err?.response?.data?.error || 'לא נמצא זיהוי ביומטרי במכשיר זה. התחבר תחילה והפעל זיהוי ביומטרי בתפריט.');
                                    }
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="w-full py-3 px-4 text-sm font-black rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                            </svg>
                            <span>התחבר עם טביעת אצבע / זיהוי פנים</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
