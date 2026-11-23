import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();


    const [activeTab, setActiveTab] = useState<'BUSINESSES' | 'FINANCIAL'>('BUSINESSES');
    const [stats, setStats] = useState<any>(null);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any>(null);
    const [feeEdits, setFeeEdits] = useState<{ [businessId: number]: string }>({});
    const [quotaEdits, setQuotaEdits] = useState<{ [businessId: number]: string }>({});
    const [supportPhone, setSupportPhone] = useState<string>('');
    const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
    const [launchFreezeMode, setLaunchFreezeMode] = useState<boolean>(false);
    const [defaultBusinessStatus, setDefaultBusinessStatus] = useState<'TRIAL' | 'SUSPENDED'>('TRIAL');
    const [defaultTrialDays, setDefaultTrialDays] = useState<string>('14');

    const [savingSettings, setSavingSettings] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED'>('ALL');

    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const fetchAllAdminData = async () => {
        try {
            setLoading(true);
            const [overviewRes, financeRes] = await Promise.all([
                axiosClient.get('/admin/overview'),
                axiosClient.get('/admin/financial-report'),
            ]);

            const bizList = overviewRes.data.businesses || [];
            setStats(overviewRes.data.stats);
            setBusinesses(bizList);
            setFinancialData(financeRes.data);

            const initialFees: { [id: number]: string } = {};
            bizList.forEach((b: any) => {
                initialFees[b.id] = String(b.monthlyFee ?? 99);
            });
            setFeeEdits(initialFees);
            const initialQuotas: { [id: number]: string } = {};
            bizList.forEach((b: any) => {
                initialQuotas[b.id] = String(b.smsQuota ?? 150);
            });
            setQuotaEdits(initialQuotas);

            const settingsRes = await axiosClient.get('/admin/settings');
            if (settingsRes.data?.settings) {
                if (settingsRes.data.settings.supportPhone) {
                    setSupportPhone(settingsRes.data.settings.supportPhone);
                }
                setMaintenanceMode(Boolean(settingsRes.data.settings.maintenanceMode));
                setLaunchFreezeMode(Boolean(settingsRes.data.settings.launchFreezeMode));
                if (settingsRes.data.settings.defaultBusinessStatus) {
                    setDefaultBusinessStatus(settingsRes.data.settings.defaultBusinessStatus);
                }
                if (settingsRes.data.settings.defaultTrialDays !== undefined) {
                    setDefaultTrialDays(String(settingsRes.data.settings.defaultTrialDays));
                }

            }





        } catch (err: any) {
            alert(err.response?.data?.error || 'אין לך הרשאה לצפות במסך זה.');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/', { replace: true });
            return;
        }
        fetchAllAdminData();
    }, [user?.id, user?.role]);

    const handleUpdateSubscription = async (businessId: number, payload: any) => {
        try {
            setUpdatingId(businessId);
            const token = localStorage.getItem('token');
            await axiosClient.put(
                `/admin/businesses/${businessId}/subscription`,
                payload,
                token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
            );
            await fetchAllAdminData();
            alert('הגדרות המנוי והתעריף עודכנו בהצלחה.');
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בעדכון הגדרות המנוי.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSaveCustomFee = async (businessId: number) => {
        const parsedFee = Number(feeEdits[businessId]);
        if (isNaN(parsedFee) || parsedFee < 0) {
            alert('יש להזין תעריף חודשי תקין (0 ומעלה).');
            return;
        }
        await handleUpdateSubscription(businessId, { monthlyFee: parsedFee });
    };
    const handleSaveSupportPhone = async () => {
        try {
            setSavingSettings(true);
            await axiosClient.put('/admin/settings', { supportPhone });
            alert('מספר הוואטסאפ לתמיכה ושדרוג מנויים נשמר בהצלחה!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בשמירת מספר הטלפון.');
        } finally {
            setSavingSettings(false);
        }
    };
    const handleToggleLaunchFreeze = async () => {
        try {
            setSavingSettings(true);
            const nextState = !launchFreezeMode;
            await axiosClient.put('/admin/settings', { launchFreezeMode: nextState });
            setLaunchFreezeMode(nextState);
            alert(
                nextState
                    ? 'מצב הקפאת השקה הופעל: לקוחות רואים מסך "עולה בקרוב", בעוד שבעלי עסקים יכולים להירשם.'
                    : 'המערכת נפתחה כעת לקהל הלקוחות הרחב!'
            );
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בעדכון מצב ההשקה.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveOnboardingPolicy = async () => {
        try {
            setSavingSettings(true);
            const days = Math.max(1, Number(defaultTrialDays) || 14);
            await axiosClient.put('/admin/settings', {
                defaultBusinessStatus,
                defaultTrialDays: days,
            });
            alert('מדיניות הרישום לעסקים חדשים נשמרה בהצלחה!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בשמירת מדיניות הרישום.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleToggleMaintenance = async () => {
        try {
            setSavingSettings(true);
            const nextState = !maintenanceMode;
            await axiosClient.put('/admin/settings', { maintenanceMode: nextState });
            setMaintenanceMode(nextState);
            alert(nextState ? 'המערכת הועברה למצב תחזוקה והוקפאה למשתמשים.' : 'מצב התחזוקה כובה והמערכת חזרה לפעילות מלאה!');
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בעדכון מצב התחזוקה.');
        } finally {
            setSavingSettings(false);
        }
    };

    const filteredBusinesses = businesses.filter((biz: any) => {
        const matchesStatus = statusFilter === 'ALL' || biz.subscriptionStatus === statusFilter;
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
            !query ||
            (biz.name || '').toLowerCase().includes(query) ||
            (biz.owner?.name || '').toLowerCase().includes(query) ||
            (biz.owner?.email || '').toLowerCase().includes(query) ||
            (biz.owner?.phone || '').includes(query);
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
                <p className="text-sm font-black text-gray-600">טוען נתוני מערכת ודוחות רווחיות...</p>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gray-50" dir="rtl">
            <Navbar />
            <div className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl shadow-xs border border-gray-100">
                        <div>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
                                👑 מרכז שליטה ראשי (Super Admin)
                            </span>
                            <h1 className="text-2xl font-black text-gray-900 mt-2">
                                {activeTab === 'BUSINESSES'
                                    ? 'ניהול עסקים, תמחור מנויים ומכסות SMS'
                                    : 'דוח הכנסות ורווחיות פלטפורמה'}
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">
                                {activeTab === 'BUSINESSES'
                                    ? 'בקרה מלאה על כל העסקים בפלטפורמה, התאמת תעריף מנוי אישי ומניעת חריגות הודעות.'
                                    : 'מעקב הכנסות קבועות ממנויים פעילים, קיזוז עלויות הודעות יוצאות וחישוב רווח נקי לפי עסק וחודש.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('BUSINESSES')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'BUSINESSES'
                                            ? 'bg-white text-gray-900 shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    🏢 ניהול עסקים ומנויים
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('FINANCIAL')}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'FINANCIAL'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    💰 דוח הכנסות ורווחיות
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/billing')}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                            >
                                💳 גבייה ותשלומים
                            </button>

                            <button
                                type="button"
                                onClick={fetchAllAdminData}
                                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                            >
                                🔄 רענן נתונים
                            </button>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:px-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-xs font-black text-gray-900">📞 מספר וואטסאפ לתמיכה ושדרוג מנויים</p>
                            <p className="text-[11px] text-gray-500">
                                בעלי עסקים שילחצו על כפתור השדרוג בלוח הבקרה שלהם יופנו ישירות למספר זה.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                dir="ltr"
                                value={supportPhone}
                                onChange={(e) => setSupportPhone(e.target.value)}
                                placeholder="050-0000000"
                                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-900 w-40 text-center focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                type="button"
                                disabled={savingSettings}
                                onClick={handleSaveSupportPhone}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                            >
                                {savingSettings ? 'שומר...' : 'שמור מספר'}
                            </button>
                        </div>
                    </div>
                    <div className={`p-4 sm:px-6 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                        <div>
                            <p className="text-xs font-black text-gray-900">
                                {maintenanceMode ? '🚨 מצב תחזוקה פעיל — המערכת מוקפאת כעת למשתמשים' : '🛡️ מתג הקפאה ראשי (מצב תחזוקה)'}
                            </p>
                            <p className="text-[11px] text-gray-600">
                                הפעלת המתג תציג מסך תחזוקה לכל הלקוחות ובעלי העסקים ותאפשר גישה רק למנהל המערכת הראשי.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={savingSettings}
                            onClick={handleToggleMaintenance}
                            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer text-white ${maintenanceMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            {savingSettings ? 'מעדכן...' : maintenanceMode ? 'החזר מערכת לפעילות' : 'הפעל מצב תחזוקה'}
                        </button>
                    </div>
                    <div className={`p-4 sm:px-6 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${launchFreezeMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                        <div>
                            <p className="text-xs font-black text-gray-900">
                                {launchFreezeMode ? '🚀 הקפאת השקה פעילה — רישום עסקים פתוח, לקוחות בהמתנה' : '🌍 מצב השקה ללקוחות קצה'}
                            </p>
                            <p className="text-[11px] text-gray-600">
                                הפעלת המתג תציג ללקוחות מסך "עולה בקרוב באזורך" ותאפשר רק לבעלי עסקים להירשם עד שתצבור כמות עסקים מספקת.
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={savingSettings}
                            onClick={handleToggleLaunchFreeze}
                            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer text-white shrink-0 ${launchFreezeMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                        >
                            {savingSettings ? 'מעדכן...' : launchFreezeMode ? 'פתח לקהל הלקוחות' : 'הפעל הקפאת השקה'}
                        </button>
                    </div>

                    <div className="bg-white p-4 sm:px-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-xs font-black text-gray-900">🔐 מדיניות ברירת מחדל לעסקים חדשים שנרשמים</p>
                            <p className="text-[11px] text-gray-500">
                                קבע האם עסק חדש יקבל תקופת ניסיון אוטומטית או ייכנס להקפאה עד אישור ותשלום מולך.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={defaultBusinessStatus}
                                onChange={(e) => setDefaultBusinessStatus(e.target.value as 'TRIAL' | 'SUSPENDED')}
                                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-900 bg-gray-50 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="TRIAL">🎁 תקופת ניסיון אוטומטית (TRIAL)</option>
                                <option value="SUSPENDED">🔒 חסימה עד אישור ותשלום (SUSPENDED)</option>
                            </select>

                            {defaultBusinessStatus === 'TRIAL' && (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={defaultTrialDays}
                                        onChange={(e) => setDefaultTrialDays(e.target.value)}
                                        className="w-16 px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-900 text-center focus:outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-xs font-bold text-gray-600">ימי ניסיון</span>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={savingSettings}
                                onClick={handleSaveOnboardingPolicy}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                            >
                                {savingSettings ? 'שומר...' : 'שמור מדיניות'}
                            </button>
                        </div>
                    </div>

                    {activeTab === 'BUSINESSES' && (
                        <>
                            {stats && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-right">
                                        <p className="text-[11px] font-bold text-gray-400">סה״כ עסקים</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalBusinesses}</p>
                                    </div>
                                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-right">
                                        <p className="text-[11px] font-bold text-emerald-700">מנויים פעילים</p>
                                        <p className="text-2xl font-black text-emerald-900 mt-1">{stats.activeBusinesses}</p>
                                    </div>
                                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 text-right">
                                        <p className="text-[11px] font-bold text-amber-700">בתקופת ניסיון</p>
                                        <p className="text-2xl font-black text-amber-900 mt-1">{stats.trialBusinesses}</p>
                                    </div>
                                    <div className="bg-red-50/70 p-4 rounded-2xl border border-red-100 text-right">
                                        <p className="text-[11px] font-bold text-red-700">עסקים מושעים</p>
                                        <p className="text-2xl font-black text-red-900 mt-1">{stats.suspendedBusinesses}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-right">
                                        <p className="text-[11px] font-bold text-gray-400">לקוחות רשומים</p>
                                        <p className="text-2xl font-black text-blue-600 mt-1">{stats.totalClients}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs text-right">
                                        <p className="text-[11px] font-bold text-gray-400">סה״כ תורים</p>
                                        <p className="text-2xl font-black text-indigo-600 mt-1">{stats.totalAppointments}</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <h2 className="text-base font-black text-gray-900">
                                        רשימת עסקים ותמחור מנויים ({filteredBusinesses.length} מתוך {businesses.length})
                                    </h2>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="🔍 חיפוש עסק, בעל עסק או טלפון..."
                                            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 w-60 focus:outline-none focus:border-indigo-500"
                                        />

                                        <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 text-[11px] font-black">
                                            {[
                                                { key: 'ALL', label: 'הכל' },
                                                { key: 'ACTIVE', label: 'פעילים' },
                                                { key: 'TRIAL', label: 'ניסיון' },
                                                { key: 'SUSPENDED', label: 'מושעים' },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setStatusFilter(tab.key as any)}
                                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === tab.key
                                                            ? 'bg-white text-indigo-700 shadow-xs'
                                                            : 'text-gray-500 hover:text-gray-800'
                                                        }`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-50 text-gray-500 font-black border-b">
                                            <tr>
                                                <th className="py-3.5 px-4">שם העסק</th>
                                                <th className="py-3.5 px-4">בעל העסק וטלפון</th>
                                                <th className="py-3.5 px-4">סטטוס מנוי</th>
                                                <th className="py-3.5 px-4">תעריף מנוי חודשי (₪)</th>
                                                <th className="py-3.5 px-4">ניצולת SMS החודש</th>
                                                <th className="py-3.5 px-4">פעילות</th>
                                                <th className="py-3.5 px-4">פעולות ניהול</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredBusinesses.map((biz: any) => {

                                                const isSuspended = biz.subscriptionStatus === 'SUSPENDED';
                                                const isActive = biz.subscriptionStatus === 'ACTIVE';

                                                return (
                                                    <tr key={biz.id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <p className="font-black text-gray-900 text-sm">{biz.name}</p>
                                                            <p className="text-[11px] text-gray-400">
                                                                {biz.category} • {biz.address || biz.city}
                                                            </p>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <p className="font-bold text-gray-800">{biz.owner?.name}</p>
                                                            <p className="text-[11px] text-gray-500">
                                                                {biz.owner?.phone} | {biz.owner?.email}
                                                            </p>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <span
                                                                className={`px-2.5 py-1 rounded-full text-[11px] font-black ${isActive
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : isSuspended
                                                                            ? 'bg-red-100 text-red-800'
                                                                            : 'bg-amber-100 text-amber-800'
                                                                    }`}
                                                            >
                                                                {isActive ? '✅ פעיל (משלם)' : isSuspended ? '⛔ מושעה' : '⏳ ניסיון (Trial)'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step={1}
                                                                    value={feeEdits[biz.id] ?? biz.monthlyFee ?? 99}
                                                                    onChange={(e) =>
                                                                        setFeeEdits((prev) => ({ ...prev, [biz.id]: e.target.value }))
                                                                    }
                                                                    className="w-20 px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-black text-gray-900 focus:outline-none focus:border-indigo-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={updatingId === biz.id}
                                                                    onClick={() => handleSaveCustomFee(biz.id)}
                                                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-black text-[11px] transition-all cursor-pointer"
                                                                >
                                                                    שמור
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-black text-gray-800">{biz.smsUsedThisMonth} /</span>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step={50}
                                                                    value={quotaEdits[biz.id] ?? biz.smsQuota ?? 150}
                                                                    onChange={(e) =>
                                                                        setQuotaEdits((prev) => ({ ...prev, [biz.id]: e.target.value }))
                                                                    }
                                                                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-black text-gray-900 text-center focus:outline-none focus:border-indigo-500"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={updatingId === biz.id}
                                                                    onClick={() =>
                                                                        handleUpdateSubscription(biz.id, {
                                                                            smsQuota: Number(quotaEdits[biz.id] ?? biz.smsQuota),
                                                                        })
                                                                    }
                                                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-black text-[10px] cursor-pointer"
                                                                >
                                                                    עדכן
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={updatingId === biz.id}
                                                                    onClick={() =>
                                                                        handleUpdateSubscription(biz.id, { resetSmsCounter: true })
                                                                    }
                                                                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-black text-[10px] cursor-pointer"
                                                                >
                                                                    איפוס
                                                                </button>
                                                            </div>
                                                        </td>

                                                        <td className="py-4 px-4 text-gray-600 font-bold">
                                                            {biz._count?.appointments || 0} תורים • {biz._count?.staff || 0} עובדים
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {!isActive && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={updatingId === biz.id}
                                                                        onClick={() =>
                                                                            handleUpdateSubscription(biz.id, { subscriptionStatus: 'ACTIVE' })
                                                                        }
                                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] cursor-pointer"
                                                                    >
                                                                        הפעל מנוי
                                                                    </button>
                                                                )}
                                                                {!isSuspended ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={updatingId === biz.id}
                                                                        onClick={() =>
                                                                            handleUpdateSubscription(biz.id, { subscriptionStatus: 'SUSPENDED' })
                                                                        }
                                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-black text-[11px] cursor-pointer"
                                                                    >
                                                                        השעה עסק
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={updatingId === biz.id}
                                                                        onClick={() =>
                                                                            handleUpdateSubscription(biz.id, { subscriptionStatus: 'TRIAL' })
                                                                        }
                                                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-black text-[11px] cursor-pointer"
                                                                    >
                                                                        החזר לניסיון
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'FINANCIAL' && financialData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                                    <p className="text-xs font-bold text-gray-400">הכנסה חודשית קבועה (MRR)</p>
                                    <p className="text-3xl font-black text-indigo-600 mt-2">
                                        ₪{financialData.summary.totalMonthlyRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        מתוך {financialData.summary.activeSubscribersCount} מנויים פעילים משלמים
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                                    <p className="text-xs font-bold text-gray-400">עלות הודעות יוצאות החודש</p>
                                    <p className="text-3xl font-black text-red-500 mt-2">
                                        -₪{financialData.summary.totalMonthlySmsCost.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        לפי תעריף ₪{financialData.smsUnitCost} להודעת תזכורת
                                    </p>
                                </div>

                                <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg">
                                    <p className="text-xs font-bold text-emerald-100">רווח נקי חודשי (נטו)</p>
                                    <p className="text-3xl font-black mt-2">
                                        ₪{financialData.summary.totalMonthlyNetProfit.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-emerald-100 mt-1">
                                        לאחר קיזוז מלא של עלויות הודעות יוצאות
                                    </p>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                                    <p className="text-xs font-bold text-gray-400">תחזית הכנסה שנתית (ARR)</p>
                                    <p className="text-3xl font-black text-gray-900 mt-2">
                                        ₪{(financialData.summary.totalMonthlyNetProfit * 12).toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        רווח נקי שנתי צפוי בקצב הפעילות הנוכחי
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">
                                            📊 מגמת הכנסות ורווח נקי (6 חודשים אחרונים)
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            השוואה בין הכנסות ממנויים פעילים לרווח נקי לאחר קיזוז עלות הודעות
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-3 text-[11px] font-bold">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block"></span>
                                                הכנסות ממנויים
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                                                רווח נקי (נטו)
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const headers = ['עסק', 'בעל עסק', 'סטטוס', 'הכנסה ממנוי', 'הודעות', 'עלות הודעות', 'רווח נקי'];
                                                const rows = financialData.businessBreakdown.map((b: any) => [
                                                    `"${b.name}"`,
                                                    `"${b.ownerName}"`,
                                                    b.subscriptionStatus,
                                                    b.revenue,
                                                    b.smsUsedThisMonth,
                                                    b.smsCost.toFixed(2),
                                                    b.netProfit.toFixed(2),
                                                ]);
                                                const csvContent =
                                                    '\uFEFF' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
                                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.setAttribute('download', `SmartQueue_Report_${new Date().toISOString().slice(0, 10)}.csv`);
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                            className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                                        >
                                            📥 ייצא לאקסל (CSV)
                                        </button>
                                    </div>
                                </div>

                                {(() => {
                                    const maxVal = Math.max(
                                        100,
                                        ...financialData.monthlyHistory.map((m: any) => Math.max(m.revenue, m.netProfit, 0))
                                    );
                                    return (
                                        <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-52 pt-6 px-2 border-b border-gray-100">
                                            {financialData.monthlyHistory.map((m: any) => {
                                                const revHeight = Math.max(4, Math.round((m.revenue / maxVal) * 100));
                                                const netHeight = Math.max(4, Math.round((Math.max(0, m.netProfit) / maxVal) * 100));
                                                return (
                                                    <div key={m.monthKey} className="flex flex-col items-center h-full justify-end group">
                                                        <div className="text-[10px] font-black text-gray-600 mb-1.5">
                                                            ₪{m.netProfit.toLocaleString()}
                                                        </div>
                                                        <div className="w-full flex items-end justify-center gap-1.5 h-36">
                                                            <div
                                                                style={{ height: `${revHeight}%` }}
                                                                title={`הכנסות: ₪${m.revenue}`}
                                                                className="w-4 sm:w-6 bg-indigo-500/85 hover:bg-indigo-600 rounded-t-lg transition-all"
                                                            />
                                                            <div
                                                                style={{ height: `${netHeight}%` }}
                                                                title={`רווח נקי: ₪${m.netProfit}`}
                                                                className="w-4 sm:w-6 bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all"
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-gray-500 mt-2 text-center truncate w-full">
                                                            {m.monthLabel.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100">
                                    <h2 className="text-base font-black text-gray-900">
                                        רווחיות חודשית לפי עסק (הכנסת מנוי מול עלות הודעות)
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-50 text-gray-500 font-black border-b">
                                            <tr>
                                                <th className="py-3.5 px-4">שם העסק</th>
                                                <th className="py-3.5 px-4">בעל העסק</th>
                                                <th className="py-3.5 px-4">סטטוס חיוב</th>
                                                <th className="py-3.5 px-4">הכנסה ממנוי (₪)</th>
                                                <th className="py-3.5 px-4">הודעות שנשלחו</th>
                                                <th className="py-3.5 px-4">קיזוז עלות הודעות (₪)</th>
                                                <th className="py-3.5 px-4">רווח נקי מעסק (₪)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {financialData.businessBreakdown.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="py-3.5 px-4 font-black text-gray-900">{item.name}</td>
                                                    <td className="py-3.5 px-4 text-gray-600 font-bold">{item.ownerName}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${item.subscriptionStatus === 'ACTIVE'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : item.subscriptionStatus === 'SUSPENDED'
                                                                        ? 'bg-red-100 text-red-800'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                }`}
                                                        >
                                                            {item.subscriptionStatus === 'ACTIVE'
                                                                ? 'מנוי פעיל'
                                                                : item.subscriptionStatus === 'SUSPENDED'
                                                                    ? 'מושעה'
                                                                    : 'תקופת ניסיון'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-black text-indigo-600">
                                                        ₪{item.revenue.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-gray-700 font-bold">
                                                        {item.smsUsedThisMonth} הודעות
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-red-500">
                                                        -₪{item.smsCost.toFixed(2)}
                                                    </td>
                                                    <td
                                                        className={`py-3.5 px-4 font-black text-sm ${item.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                                                            }`}
                                                    >
                                                        ₪{item.netProfit.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
                                <div className="p-5 border-b border-gray-100">
                                    <h2 className="text-base font-black text-gray-900">
                                        סיכום הכנסות ורווח נקי לפי חודש (6 חודשים אחרונים)
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-50 text-gray-500 font-black border-b">
                                            <tr>
                                                <th className="py-3.5 px-4">חודש</th>
                                                <th className="py-3.5 px-4">מנויים פעילים</th>
                                                <th className="py-3.5 px-4">הכנסות ממנויים (₪)</th>
                                                <th className="py-3.5 px-4">קיזוז עלויות הודעות (₪)</th>
                                                <th className="py-3.5 px-4">רווח נקי חודשי (₪)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {financialData.monthlyHistory.map((m: any) => (
                                                <tr key={m.monthKey} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="py-3.5 px-4 font-black text-gray-900">{m.monthLabel}</td>
                                                    <td className="py-3.5 px-4 font-bold text-gray-700">{m.activeCount} עסקים</td>
                                                    <td className="py-3.5 px-4 font-black text-indigo-600">
                                                        ₪{m.revenue.toLocaleString()}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-red-500">
                                                        -₪{m.smsCost.toFixed(2)}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                                                        ₪{m.netProfit.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
