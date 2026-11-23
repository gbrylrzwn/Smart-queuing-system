import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { showConfirm } from '../components/common/GlobalAlertModal';
import ClientProfileModal from '../components/business/ClientProfileModal';
import SmartBiPanel from '../components/business/SmartBiPanel';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [myBusiness, setMyBusiness] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [waitlist, setWaitlist] = useState<any[]>([]);

    const [reminderModalApp, setReminderModalApp] = useState<any | null>(null);
    const [platformSupportPhone, setPlatformSupportPhone] = useState<string>('972500000000');
    const [selectedClientIdForCrm, setSelectedClientIdForCrm] = useState<number | null>(null);
    const [showSmartBiModal, setShowSmartBiModal] = useState<boolean>(false);
    const [noShowConfirmApp, setNoShowConfirmApp] = useState<any>(null);

    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [calendarView, setCalendarView] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');

    const [staffName, setStaffName] = useState<string>('');
    const [staffImage, setStaffImage] = useState<string>('');
    const [isAddingStaff, setIsAddingStaff] = useState<boolean>(false);
    const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
    const [staffServiceIds, setStaffServiceIds] = useState<number[]>([]);


    // סטייטים לניהול משמרות והפסקות אישיות לכל עובד
    const [scheduleStaff, setScheduleStaff] = useState<any | null>(null);
    const [staffHours, setStaffHours] = useState<any[]>([]);
    const [staffBreaks, setStaffBreaks] = useState<any[]>([]);
    const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

    const openStaffScheduleModal = (member: any) => {
        setScheduleStaff(member);
        const bizHours = myBusiness?.workingHours || [];
        const existingStaffHours = member.workingHours || [];

        const initialHours = Array.from({ length: 7 }, (_, day) => {
            const bizDay = bizHours.find((h: any) => h.day === day);
            const stfDay = existingStaffHours.find((h: any) => h.day === day);
            if (!bizDay || !bizDay.isOpen) {
                return { day, isOpen: false, openTime: '09:00', closeTime: '17:00' };
            }
            return {
                day,
                isOpen: stfDay ? stfDay.isOpen : true,
                openTime: stfDay ? stfDay.openTime : bizDay.openTime,
                closeTime: stfDay ? stfDay.closeTime : bizDay.closeTime
            };
        });

        setStaffHours(initialHours);
        setStaffBreaks(member.breaks ? [...member.breaks] : []);
    };

    const handleSaveStaffSchedule = async () => {
        if (!scheduleStaff) return;
        try {
            setSavingSchedule(true);
            await axiosClient.put(`/business/staff/${scheduleStaff.id}/working-hours`, {
                workingHours: staffHours,
                breaks: staffBreaks
            });
            alert(`משמרות והפסקות עבור ${scheduleStaff.name} נשמרו בהצלחה!`);
            setScheduleStaff(null);
            const businessRes = await axiosClient.get('/business/my-business');
            setMyBusiness(businessRes.data.business);
            axiosClient.get('/admin/settings').then((res) => {
                if (res.data?.settings?.supportPhone) {
                    setPlatformSupportPhone(res.data.settings.supportPhone);
                }
            }).catch(() => { });

        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בשמירת משמרות העובד.');
        } finally {
            setSavingSchedule(false);
        }
    };
    // סטייטים ופונקציות להוספת תור ידני / טלפוני על ידי בעל העסק
    const [showManualModal, setShowManualModal] = useState<boolean>(false);
    const [manualName, setManualName] = useState<string>('');
    const [manualPhone, setManualPhone] = useState<string>('');
    const [manualStaffId, setManualStaffId] = useState<number | null>(null);
    const [manualServiceIds, setManualServiceIds] = useState<number[]>([]);
    const [manualDate, setManualDate] = useState<string>(selectedDate);
    const [manualSlots, setManualSlots] = useState<string[]>([]);
    const [manualSlot, setManualSlot] = useState<string>('');
    const [loadingManualSlots, setLoadingManualSlots] = useState<boolean>(false);
    const [savingManual, setSavingManual] = useState<boolean>(false);

    useEffect(() => {
        const fetchManualSlots = async () => {
            if (!showManualModal || !myBusiness?.id || manualServiceIds.length === 0 || !manualDate) {
                setManualSlots([]);
                return;
            }
            try {
                setLoadingManualSlots(true);
                setManualSlot('');
                const staffParam = manualStaffId ? `&staffId=${manualStaffId}` : '';
                const res = await axiosClient.get(
                    `/appointments/available?businessId=${myBusiness.id}&serviceId=${manualServiceIds.join(',')}&date=${manualDate}${staffParam}`
                );
                const rawSlots: string[] = res.data.slots || [];
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                const validSlots = manualDate === todayStr
                    ? rawSlots.filter((slot) => {
                        const [sH, sM] = slot.split(':').map(Number);
                        return sH > now.getHours() || (sH === now.getHours() && sM > now.getMinutes());
                    })
                    : rawSlots;

                setManualSlots(validSlots);

            } catch {
                setManualSlots([]);
            } finally {
                setLoadingManualSlots(false);
            }
        };
        fetchManualSlots();
    }, [showManualModal, myBusiness, manualServiceIds, manualDate, manualStaffId]);

    const handleSaveManualAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualName.trim() || !manualPhone.trim() || manualServiceIds.length === 0 || !manualSlot) {
            alert('אנא מלא שם לקוח, טלפון, שירות ושעה פנויה.');
            return;
        }
        try {
            setSavingManual(true);
            await axiosClient.post('/appointments/manual-book', {
                clientName: manualName,
                clientPhone: manualPhone,
                serviceIds: manualServiceIds,
                staffId: manualStaffId,
                date: manualDate,
                startTime: manualSlot
            });
            alert('התור הידני שוריין בהצלחה ביומן!');
            setShowManualModal(false);
            setManualName('');
            setManualPhone('');
            setManualServiceIds([]);
            setManualSlot('');
            window.location.reload();
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בשריון התור הידני.');
        } finally {
            setSavingManual(false);
        }
    };
    // סטייטים ופונקציות לחסימת זמנים וימי חופשה נקודתיים
    const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
    const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
    const [blockStaffId, setBlockStaffId] = useState<string>('');
    const [blockDate, setBlockDate] = useState<string>(selectedDate);
    const [blockFullDay, setBlockFullDay] = useState<boolean>(false);
    const [blockStartTime, setBlockStartTime] = useState<string>('10:00');
    const [blockEndTime, setBlockEndTime] = useState<string>('12:00');
    const [blockReason, setBlockReason] = useState<string>('');
    const [savingBlock, setSavingBlock] = useState<boolean>(false);

    const fetchBlockedTimes = async (bizId: number) => {
        try {
            const res = await axiosClient.get(`/business/${bizId}/blocked-times`);
            setBlockedTimes(res.data.blockedTimes || []);
        } catch {
            setBlockedTimes([]);
        }
    };

    const handleAddBlockedTime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myBusiness?.id || !blockDate) return;
        try {
            setSavingBlock(true);
            await axiosClient.post(`/business/${myBusiness.id}/blocked-times`, {
                staffId: blockStaffId ? Number(blockStaffId) : null,
                date: blockDate,
                isFullDay: blockFullDay,
                startTime: blockStartTime,
                endTime: blockEndTime,
                reason: blockReason
            });
            alert('החסימה נשמרה בהצלחה ביומן!');
            setBlockReason('');
            await fetchBlockedTimes(myBusiness.id);
        } catch (err: any) {
            alert(err.response?.data?.error || 'נכשלנו בשמירת החסימה.');
        } finally {
            setSavingBlock(false);
        }
    };

    const handleDeleteBlockedTime = async (blockId: number) => {
        const ok = await showConfirm({
            title: 'הסרת חסימת זמן',
            message: 'האם להסיר חסימת זמן זו ולפתוח את השעות לקביעת תורים?',
            confirmText: 'כן, הסר חסימה',
            cancelText: 'ביטול',
            isDanger: true,
        });

        if (!ok) return;

        try {
            await axiosClient.delete(`/business/blocked-times/${blockId}`);
            if (myBusiness?.id) await fetchBlockedTimes(myBusiness.id);
        } catch {
            alert('נכשלנו בהסרת החסימה.');
        }
    };
    const sendWhatsAppReminder = (app: any) => {
        const rawPhone = (app.client?.phone || '').replace(/\D/g, '');
        const intlPhone = rawPhone.startsWith('0') ? '972' + rawPhone.slice(1) : rawPhone;
        const formattedDate = new Date(app.date).toLocaleDateString('he-IL');
        const text = `היי ${app.client?.name || ''}, תזכורת ידידותית לתור שלך ב-${myBusiness?.name || 'העסק שלנו'} בתאריך ${formattedDate} בשעה ${app.startTime}. נשמח לראותך!`;
        const waBase = 'https://' + 'wa.me/';
        window.open(waBase + intlPhone + '?text=' + encodeURIComponent(text), '_blank');
    };



    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                try {
                    const businessRes = await axiosClient.get('/business/my-business');
                    setMyBusiness(businessRes.data.business);
                } catch (bErr) {
                    console.error("Business fetch failed:", bErr);
                    setMyBusiness(null);
                }

                try {
                    let queryStr = `date=${selectedDate}`;
                    if (calendarView === 'WEEK') {
                        const base = new Date(selectedDate);
                        const dayOfWeek = base.getDay();
                        const start = new Date(base);
                        start.setDate(base.getDate() - dayOfWeek);
                        const end = new Date(start);
                        end.setDate(start.getDate() + 6);
                        queryStr = `startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`;
                    } else if (calendarView === 'MONTH') {
                        const base = new Date(selectedDate);
                        const start = new Date(base.getFullYear(), base.getMonth(), 1);
                        const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
                        queryStr = `startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`;
                    }
                    const appRes = await axiosClient.get(`/appointments/business-orders?${queryStr}`);

                    if (appRes.data) {
                        setAppointments(appRes.data.appointments || []);
                        setWaitlist(appRes.data.waitlist || []);
                    }
                } catch (aErr) {
                    console.error("Appointments fetch failed:", aErr);
                    setAppointments([]);
                    setWaitlist([]);
                }

            } catch (err: any) {
                setError('נכשלנו בטעינת נתוני לוח הבקרה. אנא רענן את העמוד.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedDate, calendarView]);

    const handleAddOrUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffName.trim() || !myBusiness) return;
        try {
            setIsAddingStaff(true);
            if (editingStaffId) {
                await axiosClient.put(`/business/staff/${editingStaffId}`, {
                    name: staffName,
                    imageUrl: staffImage,
                    serviceIds: staffServiceIds
                });
                alert('פרטי איש הצוות והשירותים שלו עודכנו בהצלחה!');
            } else {
                await axiosClient.post(`/business/${myBusiness.id}/staff`, {
                    name: staffName,
                    imageUrl: staffImage,
                    serviceIds: staffServiceIds
                });
                alert('איש הצוות התווסף בהצלחה ליומן העסק!');
            }

            setStaffName('');
            setStaffImage('');
            setStaffServiceIds([]);
            setEditingStaffId(null);

            const businessRes = await axiosClient.get('/business/my-business');
            setMyBusiness(businessRes.data.business);
        } catch (err) {
            alert('נכשלנו בשמירת איש הצוות במערכת.');
        } finally {
            setIsAddingStaff(false);
        }
    };


    const handleDeleteStaff = async (staffId: number) => {
        const ok = await showConfirm({
            title: 'אישור פעולה',
            message: 'האם אתה בטוח שברצונך לבצע פעולה זו?',
            confirmText: 'כן, המשך',
            cancelText: 'ביטול',
            isDanger: true,
        });

        if (!ok) return;

        try {
            await axiosClient.delete(`/business/staff/${staffId}`);
            alert('איש הצוות נמחק בהצלחה מהמערכת!');
            const businessRes = await axiosClient.get('/business/my-business');
            setMyBusiness(businessRes.data.business);
        } catch (err) {
            alert('נכשלנו במחיקת איש הצוות.');
        }
    };

    const startEditStaff = (member: any) => {
        setEditingStaffId(member.id);
        setStaffName(member.name);
        setStaffImage(member.imageUrl || '');
        setStaffServiceIds(member.services ? member.services.map((s: any) => s.id) : []);
    };

    if (myBusiness && myBusiness.subscriptionStatus === 'SUSPENDED') {
        const supportMessage = `שלום, המנוי של העסק "${myBusiness.name}" (מזהה #${myBusiness.id}) מושעה כרגע. אשמח להסדיר תשלום ולהפעיל את המנוי מחדש.`;
        const whatsappSupportUrl = `https://wa.me{encodeURIComponent(supportMessage)}`;

        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-red-100 text-center space-y-5">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                        🔒
                    </div>
                    <h2 className="text-xl font-black text-gray-900">המנוי של העסק ממתין להסדרת תשלום</h2>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        הגישה ללוח הבקרה של <strong>{myBusiness.name}</strong> הושהתה זמנית. להפעלת המנוי מחדש ופתיחת היומן ללקוחות, לחץ על הכפתור מטה ליצירת קשר מיידי עם הנהלת המערכת.
                    </p>
                    <a
                        href={whatsappSupportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition-all"
                    >
                        💬 צור קשר להסדרת מנוי בווצאפ
                    </a>
                </div>
            </div>
        );
    }

    if (myBusiness?.subscriptionStatus === 'SUSPENDED') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-red-100 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                            ⛔
                        </div>
                        <h1 className="text-2xl font-black text-gray-900">חשבון העסק מושעה זמנית</h1>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            הגישה לניהול היומן ולקבלת תורים חדשים עבור <span className="font-bold">{myBusiness.name}</span> הושהתה על ידי הנהלת המערכת.
                        </p>
                        <p className="text-xs text-gray-400">
                            לפרטים ולהסדרת המנוי אנא פנה לתמיכה הטכנית של המערכת.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
                {/* באנר מצב מנוי ותעריף חודשי לבעל העסק */}
                {myBusiness && (
                    <div
                        className={`mb-5 p-4 sm:px-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs ${myBusiness.subscriptionStatus === 'ACTIVE'
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : myBusiness.subscriptionStatus === 'SUSPENDED'
                                ? 'bg-red-50 border-red-200 text-red-950'
                                : 'bg-amber-50/90 border-amber-200 text-amber-950'
                            }`}
                    >
                        <div className="flex items-start sm:items-center gap-3">
                            <span className="text-2xl">
                                {myBusiness.subscriptionStatus === 'ACTIVE'
                                    ? '✅'
                                    : myBusiness.subscriptionStatus === 'SUSPENDED'
                                        ? '⛔'
                                        : '⏳'}
                            </span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black">
                                        {myBusiness.subscriptionStatus === 'ACTIVE'
                                            ? 'מנוי עסקי פעיל'
                                            : myBusiness.subscriptionStatus === 'SUSPENDED'
                                                ? 'המנוי מושעה זמנית — קביעת תורים חדשים חסומה'
                                                : 'חשבון בתקופת ניסיון חינמית (Trial)'}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white/80 border border-black/10">
                                        תעריף מנוי: ₪{myBusiness.monthlyFee ?? 99} / חודש
                                    </span>
                                </div>
                                <p className="text-xs opacity-85 mt-1">
                                    יתרת הודעות תזכורת החודש:{' '}
                                    <span className="font-black">
                                        {Math.max(0, (myBusiness.smsQuota || 150) - (myBusiness.smsUsedThisMonth || 0))} מתוך{' '}
                                        {myBusiness.smsQuota || 150}
                                    </span>{' '}
                                    הודעות זמינות
                                    {myBusiness.subscriptionStatus === 'TRIAL' && myBusiness.trialEndsAt && (
                                        <> • סיום ניסיון: {new Date(myBusiness.trialEndsAt).toLocaleDateString('he-IL')}</>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const adminPhone = platformSupportPhone; // החלף למספר הוואטסאפ שלך כמנהל הפלטפורמה
                                    const msg =
                                        myBusiness.subscriptionStatus === 'ACTIVE'
                                            ? `היי, אני בעל העסק "${myBusiness.name}" ואשמח להרחיב את חבילת ההודעות / התוכנית שלי ב-SmartQueue.`
                                            : `היי, אני בעל העסק "${myBusiness.name}" ואשמח להסדיר תשלום ולהפעיל מנוי חודשי (₪${myBusiness.monthlyFee ?? 99}/חודש) ב-SmartQueue.`;
                                    const waBase = 'https://' + 'wa.me/';
                                    window.open(waBase + adminPhone + '?text=' + encodeURIComponent(msg), '_blank');
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all cursor-pointer ${myBusiness.subscriptionStatus === 'ACTIVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : myBusiness.subscriptionStatus === 'SUSPENDED'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                            >
                                {myBusiness.subscriptionStatus === 'ACTIVE'
                                    ? '💬 הרחבת חבילה / תמיכה'
                                    : '🚀 שדרג והפעל מנוי'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 text-right" dir="rtl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                        <div className="text-right">
                            <h1 className="text-2xl font-black text-gray-900">לוח בקרה וניהול יומן</h1>
                            <p className="text-xs text-gray-500 mt-1">
                                שלום <span className="font-bold text-gray-800">{user?.name}</span>, כאן אתה מנהל את סדר היום עבור העסק שלך:{' '}
                                <span className="font-black text-blue-600">{myBusiness?.name}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                                <span className="text-xs font-bold text-gray-600">הצג תאריך:</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-xs font-black text-gray-900 focus:outline-none cursor-pointer"
                                />
                            </div>

                            {myBusiness && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const smartUrl = `${window.location.origin}/business/${myBusiness.id}`;
                                            navigator.clipboard.writeText(smartUrl);
                                            alert('הקישור החכם לקביעת תור הועתק ללוח!');
                                        }}
                                        className="px-3 py-2 rounded-xl text-xs font-black bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-all cursor-pointer"
                                    >
                                        🔗 העתק קישור
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const smartUrl = `${window.location.origin}/business/${myBusiness.id}`;
                                            const msg = `היי! מוזמנים לקבוע תור אונליין בקליק אחד אצל ${myBusiness.name}:\n${smartUrl}`;
                                            window.open(`https://wa.me{encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                                    >
                                        📲 וואטסאפ
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const smartUrl = `${window.location.origin}/business/${myBusiness.id}`;
                                            const msg = `היי! מוזמנים לקבוע תור אונליין בקליק אחד אצל ${myBusiness.name}: ${smartUrl}`;
                                            window.open(`sms:?body=${encodeURIComponent(msg)}`, '_self');
                                        }}
                                        className="px-3 py-2 rounded-xl text-xs font-black bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer"
                                    >
                                        💬 SMS
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await axiosClient.put(`/business/${myBusiness.id}/toggle-mute`);
                                                setMyBusiness({ ...myBusiness, muteNotifications: res.data.muteNotifications });
                                            } catch {
                                                alert('נכשלנו בעדכון מצב ההתראות.');
                                            }
                                        }}
                                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${myBusiness.muteNotifications
                                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}
                                    >
                                        {myBusiness.muteNotifications ? '🔕 מושתק' : '🔔 התראות'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>


                    {myBusiness && (<>
                        <div className="mt-2 pt-4 border-t border-gray-100 flex flex-col items-start gap-2 w-full text-right" dir="rtl">
                            <label className="block text-xs font-bold text-gray-500 text-right">תמונת הפרופיל של העסק לפרסום:</label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full justify-start">
                                <label className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-bold border border-blue-200 transition-all active:scale-95 shadow-sm whitespace-nowrap text-center">
                                    {myBusiness.imageUrl ? '🔄 החלף תמונת פרופיל...' : '📁 בחר קובץ תמונה מהמכשיר...'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onloadend = async () => {
                                                const base64String = reader.result as string;
                                                try {
                                                    await axiosClient.put('/business/update-my-business', {
                                                        ...myBusiness,
                                                        imageUrl: base64String
                                                    });
                                                    alert('תמונת העסק עודכנה בהצלחה!');
                                                    window.location.reload();
                                                } catch (err) {
                                                    alert('נכשלנו בשמירת התמונה בשרת.');
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </label>

                                {myBusiness.imageUrl && (
                                    <div className="flex items-center gap-3 animate-fade-in">
                                        <img src={myBusiness.imageUrl} alt="תצוגה מקדימה" className="w-10 h-10 object-cover rounded-xl border border-gray-200 shadow-sm" />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const ok = await showConfirm({
                                                    title: 'אישור פעולה',
                                                    message: 'האם אתה בטוח שברצונך לבצע פעולה זו?',
                                                    confirmText: 'כן, המשך',
                                                    cancelText: 'ביטול',
                                                    isDanger: true,
                                                });

                                                if (!ok) return;

                                                try {
                                                    await axiosClient.put('/business/update-my-business', {
                                                        ...myBusiness,
                                                        imageUrl: ""
                                                    });
                                                    alert('תמונת העסק נמחקה בהצלחה!');
                                                    window.location.reload();
                                                } catch (err) {
                                                    alert('נכשלנו במחיקת התמונה מהשרת.');
                                                }
                                            }}
                                            className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            ✕ מחק תמונה
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                            <div>
                                <span className="block text-xs font-black text-gray-800">⏳ מדיניות ביטול תור עצמי על ידי לקוח:</span>
                                <span className="block text-[11px] text-gray-400">קבע כמה שעות מראש הלקוח רשאי לבטל תור בעצמו באפליקציה</span>
                            </div>
                            <select
                                value={myBusiness.cancellationHours ?? 0}
                                onChange={async (e) => {
                                    const newHours = Number(e.target.value);
                                    try {
                                        await axiosClient.put('/business/update-my-business', {
                                            ...myBusiness,
                                            cancellationHours: newHours
                                        });
                                        setMyBusiness({ ...myBusiness, cancellationHours: newHours });
                                        alert('מדיניות הביטולים עודכנה בהצלחה!');
                                    } catch {
                                        alert('נכשלנו בעדכון מדיניות הביטולים.');
                                    }
                                }}
                                className="px-3.5 py-2 border border-gray-200 bg-gray-50 rounded-xl text-xs font-black text-gray-800 cursor-pointer"
                            >
                                <option value={0}>ללא הגבלת זמן (מותר תמיד)</option>
                                <option value={2}>עד 2 שעות לפני התור</option>
                                <option value={6}>עד 6 שעות לפני התור</option>
                                <option value={12}>עד 12 שעות לפני התור</option>
                                <option value={24}>עד 24 שעות לפני התור</option>
                                <option value={48}>עד 48 שעות לפני התור</option>
                            </select>
                        </div>

                    </>)}
                </div>
                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm text-right" dir="rtl">{error}</div>}
                {loading ? (
                    <div className="text-center py-12 text-gray-500 text-lg font-medium animate-pulse">טוען את לוח הזמנים...</div>
                ) : !myBusiness ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto p-8" dir="rtl">
                        <span className="text-4xl block mb-4 text-center">🏬</span>
                        <h3 className="text-xl font-black text-gray-900 mb-2 text-center">טרם הקמת פרופיל עסקי</h3>
                        <button onClick={() => navigate('/create-business')} className="py-3 px-6 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-center">הקם פרופיל עסק עכשיו</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" dir="rtl">

                        <div className="lg:col-span-2 space-y-6 text-right" dir="rtl">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-right" dir="rtl">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center w-full" dir="rtl">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-sm font-black text-gray-800 text-right">
                                            {calendarView === 'DAY'
                                                ? `📅 סדר יום: ${new Date(selectedDate).toLocaleDateString('he-IL')}`
                                                : calendarView === 'WEEK'
                                                    ? '🗓️ פריסה שבועית (7 ימים)'
                                                    : `📆 מבט חודשי (${new Date(selectedDate).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })})`}
                                        </h2>
                                        <div className="bg-gray-200/70 p-1 rounded-xl flex items-center gap-1 text-[11px] font-black">
                                            {[
                                                { id: 'DAY', label: 'יום' },
                                                { id: 'WEEK', label: 'שבוע' },
                                                { id: 'MONTH', label: 'חודש' },
                                            ].map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => setCalendarView(v.id as any)}
                                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${calendarView === v.id
                                                        ? 'bg-white text-blue-700 shadow-xs'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                        }`}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setShowSmartBiModal(true)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl shadow-xs transition-all cursor-pointer"
                                        >
                                            ⚡ בינה עסקית וממלא חורים
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBlockDate(selectedDate);
                                                if (myBusiness?.id) fetchBlockedTimes(myBusiness.id);
                                                setShowBlockModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black rounded-xl transition-all cursor-pointer"
                                        >
                                            🚫 חסימות וחופשות
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setManualDate(selectedDate);
                                                setShowManualModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl shadow-xs transition-all cursor-pointer"
                                        >
                                            + הוסף תור ידני
                                        </button>
                                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">סה"כ: {appointments.length} תורים</span>
                                    </div>

                                </div>

                                <div className="p-6 text-right">
                                    {calendarView === 'MONTH' ? (
                                        <div>
                                            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-gray-400 mb-2">
                                                {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map((d) => (
                                                    <div key={d} className="py-1">{d}</div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1.5">
                                                {(() => {
                                                    const base = new Date(selectedDate);
                                                    const year = base.getFullYear();
                                                    const month = base.getMonth();
                                                    const firstDayIndex = new Date(year, month, 1).getDay();
                                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                    const cells = [];

                                                    for (let i = 0; i < firstDayIndex; i++) {
                                                        cells.push(<div key={`empty-${i}`} className="h-16 rounded-xl bg-gray-50/40" />);
                                                    }

                                                    for (let day = 1; day <= daysInMonth; day++) {
                                                        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                        const count = appointments.filter(
                                                            (a: any) => new Date(a.date).toISOString().split('T')[0] === cellDateStr
                                                        ).length;
                                                        const isSelected = cellDateStr === selectedDate;

                                                        cells.push(
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedDate(cellDateStr);
                                                                    setCalendarView('DAY');
                                                                }}
                                                                className={`h-16 p-1.5 rounded-xl border text-right flex flex-col justify-between transition-all cursor-pointer ${isSelected
                                                                    ? 'border-blue-600 bg-blue-50/60'
                                                                    : count > 0
                                                                        ? 'border-indigo-100 bg-indigo-50/30 hover:border-indigo-300'
                                                                        : 'border-gray-100 bg-white hover:bg-gray-50'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-black text-gray-800">{day}</span>
                                                                {count > 0 && (
                                                                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md self-end">
                                                                        {count} תורים
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    }
                                                    return cells;
                                                })()}
                                            </div>
                                        </div>
                                    ) : (


                                        appointments.length === 0 ? (
                                            <div className="text-center py-12 text-xs font-bold text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">אין תורים רשומים ביומן לתאריך זה.</div>
                                        ) : (
                                            <div className="space-y-4" dir="rtl">
                                                {appointments.map((app: any) => {
                                                    const isPending = app.status === 'PENDING' || app.status === 'WAITING';
                                                    const isCanceled = app.status === 'CANCELED';

                                                    return (
                                                        <div key={app.id} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right ${isCanceled ? 'opacity-50 bg-gray-50/40' : ''}`} dir="rtl">
                                                            <div className="text-right">
                                                                {calendarView === 'WEEK' && (
                                                                    <span className="inline-block mb-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-md">
                                                                        📆 {new Date(app.date).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                                                    </span>
                                                                )}

                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="text-sm font-black text-gray-900 text-right">{app.client?.name || 'לקוח/ה במערכת'}</p>
                                                                    {myBusiness?.smartBiEnabled !== false && app.client && (
                                                                        <span
                                                                            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${(app.client.reliabilityScore ?? 100) >= 80
                                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                                : (app.client.reliabilityScore ?? 100) >= 60
                                                                                    ? 'bg-amber-50 text-amber-700'
                                                                                    : 'bg-red-100 text-red-700'
                                                                                }`}
                                                                        >
                                                                            אמינות {app.client.reliabilityScore ?? 100}%
                                                                        </span>
                                                                    )}
                                                                    {myBusiness?.smartBiEnabled !== false && (app.client?.noShowCount || 0) > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                try {
                                                                                    await axiosClient.post(`/smart-bi/reset-reliability/${app.client.id}`);
                                                                                    alert('ציון האמינות שוקם ל-100!');
                                                                                    window.location.reload();
                                                                                } catch {
                                                                                    alert('נכשלנו באיפוס ציון האמינות.');
                                                                                }
                                                                            }}
                                                                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                                                        >
                                                                            (אפס מונה)
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs font-bold text-cyan-600 text-right mt-0.5">{app.service?.name || 'שירות טיפול'}</p>
                                                                {app.staffName && (
                                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md">
                                                                        👤 איש צוות: {app.staffName}
                                                                    </span>
                                                                )}
                                                                <p className="text-xs text-gray-400 font-medium text-right mt-1">⏱ שעות: <span className="font-bold text-gray-700">{app.startTime} - {app.endTime}</span> | 📞 נייד: {app.client?.phone || 'לא הוזן'}</p>
                                                            </div>

                                                            <div className="flex items-center gap-2 justify-end">
                                                                {isPending ? (
                                                                    <div className="flex items-center gap-1.5" dir="rtl">
                                                                        <button type="button" onClick={async () => { await axiosClient.put(`/appointments/${app.id}/approve`); alert('התור אושר ביומן.'); window.location.reload(); }} className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded-lg cursor-pointer">✓ אשר תור</button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const ok = await showConfirm({
                                                                                    title: 'דחיית תור',
                                                                                    message: 'האם לדחות תור זה?',
                                                                                    confirmText: 'כן, דחה תור',
                                                                                    cancelText: 'חזרה',
                                                                                    isDanger: true,
                                                                                });
                                                                                if (!ok) return;
                                                                                await axiosClient.put(`/appointments/${app.id}/reject`);
                                                                                alert('התור נדחה.');
                                                                                window.location.reload();
                                                                            }}
                                                                            className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-lg cursor-pointer"
                                                                        >
                                                                            ✕ דחה תור
                                                                        </button>
                                                                    </div>
                                                                ) : isCanceled ? (
                                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 border border-gray-200/50">בוטל</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-3">
                                                                        {app.status === 'PAID' ? (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">בוצע ושולם ✓</span>
                                                                        ) : (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">מאושר</span>
                                                                        )}
                                                                        {app.clientConfirmed && app.status !== 'PAID' && (
                                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                ✅ אישר הגעה
                                                                            </span>
                                                                        )}

                                                                        {(app.client?.phone || app.client?.email) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setReminderModalApp(app)}
                                                                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                                                            >
                                                                                📲 תזכורת ללקוח
                                                                            </button>
                                                                        )}
                                                                        {(app.client?.id || app.clientId) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedClientIdForCrm(app.client?.id || app.clientId)}
                                                                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                                                            >
                                                                                📂 תיק לקוח
                                                                            </button>
                                                                        )}
                                                                        {myBusiness?.smartBiEnabled !== false && app.status !== 'CANCELED' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setNoShowConfirmApp(app)}
                                                                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                                                            >
                                                                                🚫 לא הגיע
                                                                            </button>
                                                                        )}



                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const cleanDate = new Date(app.date).toISOString().slice(0, 10).replace(/-/g, '');
                                                                                const startClean = (app.startTime || '09:00').replace(':', '') + '00';
                                                                                const endClean = (app.endTime || '10:00').replace(':', '') + '00';
                                                                                const title = encodeURIComponent(`תור: ${app.client?.name || 'לקוח/ה'} - ${app.service?.name || 'טיפול'}`);
                                                                                const details = encodeURIComponent(`לקוח: ${app.client?.name || ''}\nטלפון: ${app.client?.phone || ''}\nשירות: ${app.service?.name || ''}`);
                                                                                const locationStr = encodeURIComponent(myBusiness?.address || '');
                                                                                const calBase = 'https://' + 'calendar.google.com' + '/calendar/render?action=TEMPLATE';
                                                                                const gCalUrl = `${calBase}&text=${title}&dates=${cleanDate}T${startClean}/${cleanDate}T${endClean}&details=${details}&location=${locationStr}`;
                                                                                window.open(gCalUrl, '_blank');
                                                                            }}
                                                                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                                                        >
                                                                            📅 הוסף ליומן Google
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const ok = await showConfirm({
                                                                                    title: 'ביטול תור',
                                                                                    message: 'האם לבטל תור זה? (אם התור כבר נסכם בהכנסות, הסכום ייגרע אוטומטית)',
                                                                                    confirmText: 'כן, בטל תור',
                                                                                    cancelText: 'חזרה',
                                                                                    isDanger: true,
                                                                                });
                                                                                if (!ok) return;
                                                                                await axiosClient.put(`/appointments/${app.id}/reject`);
                                                                                alert('התור בוטל והסכום עודכן.');
                                                                                window.location.reload();
                                                                            }}
                                                                            className="text-[10px] text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                                                                        >
                                                                            ביטול תור
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}

                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-right" dir="rtl">
                                <div className="px-6 py-4 border-b border-gray-100 bg-red-50/30 text-right flex justify-between items-center w-full" dir="rtl">
                                    <h3 className="text-xs font-black text-red-800 text-right">🔔 לקוחות בהמתנה להיום ({new Date(selectedDate).toLocaleDateString('he-IL')})</h3>
                                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{waitlist.length} ממתינים</span>
                                </div>

                                <div className="p-5 text-right">
                                    {waitlist.length === 0 ? (
                                        <div className="text-center py-6 text-[11px] font-bold text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-4">אין לקוחות ברשימת ההמתנה לתאריך זה.</div>
                                    ) : (
                                        <div className="space-y-3" dir="rtl">
                                            {waitlist.map((waitItem: any) => (
                                                <div key={waitItem.id} className="p-3 bg-red-50/20 border border-red-100/50 rounded-xl flex items-center justify-between text-right" dir="rtl">
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-gray-800 text-right">{waitItem.client?.name}</p>
                                                        <p className="text-[10px] font-bold text-red-600 text-right mt-0.5">מבקש: {waitItem.service?.name} | 📞 {waitItem.client?.phone}</p>
                                                    </div>
                                                    <button type="button" onClick={async () => { if (!window.confirm(`האם לשבץ את ${waitItem.client?.name}?`)) return; try { await axiosClient.post(`/appointments/convert-waitlist/${waitItem.id}`); alert('שובץ בהצלחה!'); window.location.reload(); } catch (err: any) { alert('נכשל בשיבוץ.'); } }} className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all cursor-pointer">⚡ שיבוץ מהיר</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8" dir="rtl">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-right animate-fade-in" dir="rtl">
                                <h3 className="text-base font-black text-gray-900 mb-1.5 text-right">
                                    {editingStaffId ? '📝 עריכת פרטי עובד' : '👤 ניהול צוות עובדים'}
                                </h3>
                                <p className="text-[11px] text-gray-400 font-medium mb-4 text-right">הוסף מטפלים, ספרים או אנשי שירות ושלוט בפרטיהם ובמשמרותיהם</p>

                                <form onSubmit={handleAddOrUpdateStaff} className="space-y-3 mb-4 border-b border-gray-50 pb-4" dir="rtl">
                                    <input
                                        type="text"
                                        placeholder="שם המטפל/ת (לדוגמה: דניאל)"
                                        required
                                        value={staffName}
                                        onChange={(e) => setStaffName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                    />
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold py-2 rounded-xl text-center border border-gray-200 transition-all active:scale-95">
                                            {staffImage ? '🔄 החלף תמונת עובד' : '📷 העלה תמונת עובד'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setStaffImage(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </label>
                                        {staffImage && (
                                            <div className="flex items-center gap-2 animate-fade-in">
                                                <span className="text-[10px] text-green-600 font-bold whitespace-nowrap">✓ מוכנה</span>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const ok = await showConfirm({
                                                            title: 'אישור פעולה',
                                                            message: 'האם אתה בטוח שברצונך לבצע פעולה זו?',
                                                            confirmText: 'כן, המשך',
                                                            cancelText: 'ביטול',
                                                            isDanger: true,
                                                        });

                                                        if (!ok) return;

                                                        try {
                                                            setStaffImage('');
                                                            if (editingStaffId) {
                                                                await axiosClient.put(`/business/staff/${editingStaffId}`, {
                                                                    name: staffName,
                                                                    imageUrl: ""
                                                                });
                                                                alert('תמונת העובד נמחקה בהצלחה מהמערכת!');
                                                                const businessRes = await axiosClient.get('/business/my-business');
                                                                setMyBusiness(businessRes.data.business);
                                                            } else {
                                                                alert('תמונת העובד אופסה.');
                                                            }
                                                        } catch (err) {
                                                            alert('נכשלנו במחיקת תמונת העובד מהשרת.');
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                                                >
                                                    ✕ מחק תמונה
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {myBusiness?.services && myBusiness.services.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-right">
                                            <label className="block text-[11px] font-black text-gray-700 mb-1.5">
                                                ✂️ אילו שירותים עובד זה מבצע? (אם לא סומן כלום — מבצע הכל)
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {myBusiness.services.map((srv: any) => {
                                                    const isChecked = staffServiceIds.includes(srv.id);
                                                    return (
                                                        <button
                                                            key={srv.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setStaffServiceIds(prev =>
                                                                    isChecked ? prev.filter(id => id !== srv.id) : [...prev, srv.id]
                                                                );
                                                            }}
                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${isChecked
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {isChecked ? '✓ ' : '+ '}{srv.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <button type="submit" disabled={isAddingStaff} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm text-center">
                                        {editingStaffId ? 'עדכן איש צוות' : 'הוסף עובד לצוות'}
                                    </button>
                                    {editingStaffId && (
                                        <button type="button" onClick={() => { setEditingStaffId(null); setStaffName(''); setStaffImage(''); }} className="w-full mt-1 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl text-center">ביטול עריכה</button>
                                    )}
                                </form>

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1" dir="rtl">
                                    {(!myBusiness?.staff || myBusiness.staff.length === 0) ? (
                                        <p className="text-xs text-gray-400 font-medium italic text-right py-4">אין עובדים רשומים במערכת.</p>
                                    ) : (
                                        myBusiness.staff.map((member: any) => (
                                            <div key={member.id} className="flex items-center justify-between p-2 rounded-xl border border-gray-50 bg-gray-50/40 text-right" dir="rtl">
                                                <div className="flex items-center gap-2.5 text-right">
                                                    {member.imageUrl ? (
                                                        <img src={member.imageUrl} alt={member.name} className="w-7 h-7 rounded-full object-cover border border-white shadow-sm" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black flex items-center justify-center shadow-inner">{member.name.substring(0, 2).toUpperCase()}</div>
                                                    )}
                                                    <span className="text-xs font-bold text-gray-800 text-right">{member.name}</span>
                                                </div>
                                                <div className="flex gap-1.5 items-center">
                                                    <button type="button" onClick={() => openStaffScheduleModal(member)} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 font-black cursor-pointer">⏰ משמרות והפסקות</button>
                                                    <button type="button" onClick={() => startEditStaff(member)} className="text-[10px] text-blue-500 hover:underline font-black p-1 cursor-pointer">ערוך</button>
                                                    <button type="button" onClick={() => handleDeleteStaff(member.id)} className="text-[10px] text-red-500 hover:underline font-black p-1 cursor-pointer">מחק</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <ServicesPanel myBusiness={myBusiness} setMyBusiness={setMyBusiness} />
                            <WorkingHoursPanel myBusiness={myBusiness} setMyBusiness={setMyBusiness} />
                        </div>
                    </div>
                )}
            </main>
            {selectedClientIdForCrm && myBusiness && (
                <ClientProfileModal
                    businessId={myBusiness.id}
                    businessName={myBusiness.name}
                    clientId={selectedClientIdForCrm}
                    onClose={() => setSelectedClientIdForCrm(null)}
                />
            )}
            {showSmartBiModal && myBusiness && (
                <SmartBiPanel
                    myBusiness={myBusiness}
                    setMyBusiness={setMyBusiness}
                    selectedDate={selectedDate}
                    onClose={() => setShowSmartBiModal(false)}
                />
            )}
            {noShowConfirmApp && (
                <div
                    dir="rtl"
                    style={{ zIndex: 9999 }}
                    className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={() => setNoShowConfirmApp(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-right space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl font-black">
                                🚫
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900">דיווח אי-הגעה לתור</h3>
                                <p className="text-xs text-gray-500 font-bold">
                                    לקוח: {noShowConfirmApp.client?.name || 'לקוח'} • שעה {noShowConfirmApp.startTime}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                            התור יסומן כמבוטל עקב אי-הגעה, וציון האמינות של הלקוח יתעדכן אוטומטית בהתאם להגדרות העסק.
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setNoShowConfirmApp(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl cursor-pointer"
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const targetApp = noShowConfirmApp;
                                    setNoShowConfirmApp(null);
                                    try {
                                        const res = await axiosClient.post(`/smart-bi/no-show/${targetApp.id}`);
                                        const updatedClient = res.data?.client;
                                        setAppointments((prev: any[]) =>
                                            prev.map((item) =>
                                                item.id === targetApp.id
                                                    ? {
                                                        ...item,
                                                        status: 'CANCELED',
                                                        client: updatedClient ? { ...item.client, ...updatedClient } : item.client,
                                                    }
                                                    : item
                                            )
                                        );
                                    } catch (err: any) {
                                        alert(err.response?.data?.error || 'נכשלנו בעדכון התור.');
                                    }
                                }}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer"
                            >
                                אשר דיווח אי-הגעה
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* חלון בחירת ערוץ שליחת תזכורת ללקוח (WhatsApp / אימייל / SMS) */}
            {reminderModalApp && (
                <div
                    dir="rtl"
                    style={{ zIndex: 9999 }}
                    className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={() => setReminderModalApp(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-7 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-3xl shadow-sm">
                            📲
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1">שליחת תזכורת ללקוח</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            בחר באיזה ערוץ לשלוח תזכורת עבור{' '}
                            <span className="font-bold text-gray-800">{reminderModalApp.client?.name || 'הלקוח/ה'}</span>{' '}
                            (שעה {reminderModalApp.startTime})
                        </p>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => {
                                    sendWhatsAppReminder(reminderModalApp);
                                    setReminderModalApp(null);
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                            >
                                <span className="text-2xl">💬</span>
                                <span>WhatsApp</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    const formattedDate = new Date(reminderModalApp.date).toLocaleDateString('he-IL');
                                    const subject = `תזכורת לתור שלך ב-${myBusiness?.name || 'העסק שלנו'}`;
                                    const body = `היי ${reminderModalApp.client?.name || ''},\nתזכורת ידידותית לתור שלך בתאריך ${formattedDate} בשעה ${reminderModalApp.startTime}.\nנשמח לראותך!`;
                                    const emailTo = reminderModalApp.client?.email || '';
                                    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    setReminderModalApp(null);
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                            >
                                <span className="text-2xl">✉️</span>
                                <span>אימייל</span>
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    const formattedDate = new Date(reminderModalApp.date).toLocaleDateString('he-IL');
                                    const text = `היי ${reminderModalApp.client?.name || ''}, תזכורת לתור שלך ב-${myBusiness?.name || 'העסק שלנו'} בתאריך ${formattedDate} בשעה ${reminderModalApp.startTime}.`;
                                    const phone = reminderModalApp.client?.phone || '';
                                    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                                    if (isMobile) {
                                        window.location.href = `sms:${phone}?&body=${encodeURIComponent(text)}`;
                                    } else {
                                        await navigator.clipboard.writeText(text);
                                        alert(`הודעת ה-SMS ללקוח (${phone}) הועתקה ללוח ומוכנה לשליחה!`);
                                    }
                                    setReminderModalApp(null);
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                            >
                                <span className="text-2xl">📱</span>
                                <span>SMS</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setReminderModalApp(null)}
                            className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all cursor-pointer"
                        >
                            סגור
                        </button>
                    </div>
                </div>
            )}

            {scheduleStaff && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col text-right">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900">⏰ משמרות והפסקות: {scheduleStaff.name}</h3>
                                <p className="text-[11px] text-gray-400">השעות מוגבלות אוטומטית לשעות הפתיחה של העסק</p>
                            </div>
                            <button type="button" onClick={() => setScheduleStaff(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black cursor-pointer">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'חמישי', 'יום שישי', 'שבת'].map((dayLabel, dayIdx) => {
                                const bizDay = myBusiness?.workingHours?.find((h: any) => h.day === dayIdx);
                                const isBusinessOpen = bizDay && bizDay.isOpen;
                                const currentDay = staffHours.find(h => h.day === dayIdx) || { day: dayIdx, isOpen: false, openTime: '09:00', closeTime: '17:00' };
                                const dayBreaks = staffBreaks.map((b, idx) => ({ ...b, originalIdx: idx })).filter(b => b.day === dayIdx);

                                return (
                                    <div key={dayIdx} className={`p-3 rounded-2xl border text-xs ${!isBusinessOpen ? 'bg-gray-100/70 opacity-60' : 'bg-gray-50'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-gray-800">{dayLabel}</span>
                                            {!isBusinessOpen ? (
                                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full">העסק סגור</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffHours(prev => prev.map(h => h.day === dayIdx ? { ...h, isOpen: !h.isOpen } : h))}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer ${currentDay.isOpen ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                                                >
                                                    {currentDay.isOpen ? '● עובד' : '○ חופש'}
                                                </button>
                                            )}
                                        </div>

                                        {isBusinessOpen && currentDay.isOpen && (
                                            <div className="mt-2.5 pt-2.5 border-t border-gray-200/70 space-y-2">
                                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                                    <span>טווח מותר בעסק: {bizDay.openTime} - {bizDay.closeTime}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-gray-500">התחלה:</span>
                                                        <input
                                                            type="time"
                                                            min={bizDay.openTime}
                                                            max={bizDay.closeTime}
                                                            value={currentDay.openTime}
                                                            onChange={(e) => setStaffHours(prev => prev.map(h => h.day === dayIdx ? { ...h, openTime: e.target.value } : h))}
                                                            className="w-full border rounded-lg px-2 py-1 text-center bg-white font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold text-gray-500">סיום:</span>
                                                        <input
                                                            type="time"
                                                            min={bizDay.openTime}
                                                            max={bizDay.closeTime}
                                                            value={currentDay.closeTime}
                                                            onChange={(e) => setStaffHours(prev => prev.map(h => h.day === dayIdx ? { ...h, closeTime: e.target.value } : h))}
                                                            className="w-full border rounded-lg px-2 py-1 text-center bg-white font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-1 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-gray-500">הפסקות ביום זה ({dayBreaks.length}):</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setStaffBreaks(prev => [...prev, { day: dayIdx, startTime: '13:00', endTime: '13:30' }])}
                                                            className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                                                        >
                                                            + הוסף הפסקה
                                                        </button>
                                                    </div>

                                                    {dayBreaks.map((brk) => (
                                                        <div key={brk.originalIdx} className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200">
                                                            <span className="text-[10px] text-gray-400">מ-</span>
                                                            <input
                                                                type="time"
                                                                min={currentDay.openTime}
                                                                max={currentDay.closeTime}
                                                                value={brk.startTime}
                                                                onChange={(e) => setStaffBreaks(prev => prev.map((item, i) => i === brk.originalIdx ? { ...item, startTime: e.target.value } : item))}
                                                                className="border rounded px-1.5 py-0.5 text-center text-[11px] font-bold"
                                                            />
                                                            <span className="text-[10px] text-gray-400">עד-</span>
                                                            <input
                                                                type="time"
                                                                min={currentDay.openTime}
                                                                max={currentDay.closeTime}
                                                                value={brk.endTime}
                                                                onChange={(e) => setStaffBreaks(prev => prev.map((item, i) => i === brk.originalIdx ? { ...item, endTime: e.target.value } : item))}
                                                                className="border rounded px-1.5 py-0.5 text-center text-[11px] font-bold"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setStaffBreaks(prev => prev.filter((_, i) => i !== brk.originalIdx))}
                                                                className="mr-auto text-red-500 hover:text-red-700 font-black text-xs px-1.5 cursor-pointer"
                                                                title="מחק הפסקה"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-4 mt-3 border-t flex gap-3">
                            <button
                                type="button"
                                onClick={handleSaveStaffSchedule}
                                disabled={savingSchedule}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                            >
                                {savingSchedule ? 'שומר...' : 'שמור משמרות והפסקות'}
                            </button>
                            <button type="button" onClick={() => setScheduleStaff(null)} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl cursor-pointer">
                                ביטול
                            </button>
                        </div>

                    </div>
                </div>
            )}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto text-right">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900">📞 שריון תור ידני / טלפוני</h3>
                                <p className="text-[11px] text-gray-400">התור יישמר ביומן ויתפוס את השעה אוטומטית</p>
                            </div>
                            <button type="button" onClick={() => setShowManualModal(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleSaveManualAppointment} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">שם הלקוח/ה *</label>
                                    <input type="text" required placeholder="לדוגמה: יוסי כהן" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold text-right" />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">טלפון נייד *</label>
                                    <input type="tel" required placeholder="050-0000000" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold text-right" />
                                </div>
                            </div>

                            {myBusiness?.staff && myBusiness.staff.length > 0 && (
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">בחירת איש צוות</label>
                                    <select
                                        value={manualStaffId ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : null;
                                            setManualStaffId(val);
                                            setManualServiceIds([]);
                                        }}
                                        className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-gray-800 text-right"
                                    >
                                        <option value="">👥 הראשון שמתפנה</option>
                                        {myBusiness.staff.map((m: any) => (
                                            <option key={m.id} value={m.id}>👤 {m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">בחירת שירותים (עד 2) *</label>
                                <div className="flex flex-wrap gap-1.5 bg-gray-50 p-2.5 rounded-xl border">
                                    {(() => {
                                        const activeMember = manualStaffId ? myBusiness?.staff?.find((m: any) => m.id === manualStaffId) : null;
                                        const availableServices = activeMember && activeMember.services && activeMember.services.length > 0
                                            ? myBusiness?.services?.filter((s: any) => activeMember.services.some((ms: any) => ms.id === s.id))
                                            : myBusiness?.services;

                                        return availableServices?.map((srv: any) => {
                                            const isChecked = manualServiceIds.includes(srv.id);
                                            return (
                                                <button
                                                    key={srv.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setManualServiceIds(prev => {
                                                            if (isChecked) return prev.filter(id => id !== srv.id);
                                                            if (prev.length >= 2) return prev;
                                                            return [...prev, srv.id];
                                                        });
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${isChecked ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200'}`}
                                                >
                                                    {isChecked ? '✓ ' : '+ '}{srv.name} ({srv.durationMinutes} דק' | ₪{srv.price})
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">תאריך התור *</label>
                                <input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-right" />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">שעה פנויה ביומן *</label>
                                {manualServiceIds.length === 0 ? (
                                    <p className="text-[11px] text-gray-400 bg-gray-50 p-2.5 rounded-xl border border-dashed">בחר תחילה שירות כדי להציג שעות פנויות</p>
                                ) : loadingManualSlots ? (
                                    <p className="text-[11px] text-blue-600 font-bold animate-pulse">בודק זמינות ביומן...</p>
                                ) : manualSlots.length === 0 ? (
                                    <p className="text-[11px] text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">אין שעות פנויות בתאריך זה עבור השירות והעובד שנבחרו</p>
                                ) : (
                                    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1">
                                        {manualSlots.map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setManualSlot(slot)}
                                                className={`py-1.5 rounded-lg font-black text-[11px] border cursor-pointer ${manualSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200 hover:border-blue-400'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t flex gap-2">
                                <button type="submit" disabled={savingManual || !manualSlot} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-black rounded-xl shadow-md cursor-pointer">
                                    {savingManual ? 'משריין תור...' : 'שריין תור ביומן'}
                                </button>
                                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl cursor-pointer">
                                    ביטול
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showBlockModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto text-right">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900">🚫 חסימת שעות וימי חופשה</h3>
                                <p className="text-[11px] text-gray-400">נעילת זמנים חד-פעמית עבור העסק או עובד ספציפי</p>
                            </div>
                            <button type="button" onClick={() => setShowBlockModal(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={handleAddBlockedTime} className="space-y-3 text-xs border-b pb-4 mb-4">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">עבור מי החסימה?</label>
                                    <select value={blockStaffId} onChange={(e) => setBlockStaffId(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-right">
                                        <option value="">🏢 כל העסק</option>
                                        {myBusiness?.staff?.map((m: any) => (
                                            <option key={m.id} value={m.id}>👤 {m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">תאריך *</label>
                                    <input type="date" required value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-right" />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 cursor-pointer">
                                <input type="checkbox" checked={blockFullDay} onChange={(e) => setBlockFullDay(e.target.checked)} className="rounded text-amber-600" />
                                <span className="font-black text-amber-900">חסימת יום שלם (יום חופש מלא)</span>
                            </label>

                            {!blockFullDay && (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">משעה *</label>
                                        <input type="time" required value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-center" />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">עד שעה *</label>
                                        <input type="time" required value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white font-bold text-center" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">סיבת החסימה (אופציונלי)</label>
                                <input type="text" placeholder="לדוגמה: חופשה, רופא שיניים, סידורים..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-semibold text-right" />
                            </div>

                            <button type="submit" disabled={savingBlock} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-sm cursor-pointer">
                                {savingBlock ? 'שומר חסימה...' : '+ הוסף חסימה ליומן'}
                            </button>
                        </form>

                        <div>
                            <h4 className="font-black text-gray-800 text-xs mb-2">חסימות פעילות רשומות ({blockedTimes.length}):</h4>
                            {blockedTimes.length === 0 ? (
                                <p className="text-[11px] text-gray-400 bg-gray-50 p-3 rounded-xl text-center">אין חסימות זמן רשומות כרגע.</p>
                            ) : (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {blockedTimes.map((blk: any) => (
                                        <div key={blk.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border text-[11px]">
                                            <div>
                                                <span className="font-black text-gray-900 block">
                                                    {new Date(blk.date).toLocaleDateString('he-IL')} | {blk.startTime === '00:00' && blk.endTime === '23:59' ? 'יום שלם' : `${blk.startTime} - ${blk.endTime}`}
                                                </span>
                                                <span className="text-gray-500 font-bold">
                                                    {blk.staff ? `👤 ${blk.staff.name}` : '🏢 כל העסק'} {blk.reason ? `• ${blk.reason}` : ''}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => handleDeleteBlockedTime(blk.id)} className="text-red-500 hover:underline font-black px-2 cursor-pointer">✕ בטל</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
const ServicesPanel: React.FC<{ myBusiness: any, setMyBusiness: any }> = ({ myBusiness, setMyBusiness }) => {
    const [serviceName, setServiceName] = useState<string>('');
    const [servicePrice, setServicePrice] = useState<string>('');
    const [serviceDuration, setServiceDuration] = useState<string>('30');
    const [loading, setLoading] = useState<boolean>(false);
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

    const handleAddOrUpdateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceName.trim() || !servicePrice || !serviceDuration) return;
        try {
            setLoading(true);
            if (editingServiceId) {
                await axiosClient.put(`/business/services/${editingServiceId}`, {
                    name: serviceName,
                    price: Number(servicePrice),
                    durationMinutes: Number(serviceDuration)
                });
                alert('השירות עודכן בהצלחה!');
            } else {
                await axiosClient.post(`/business/${myBusiness.id}/services`, {
                    name: serviceName,
                    price: Number(servicePrice),
                    durationMinutes: Number(serviceDuration)
                });
                alert('השירות והמחירון התווספו בהצלחה!');
            }
            setServiceName(''); setServicePrice(''); setServiceDuration('30'); setEditingServiceId(null);
            const businessRes = await axiosClient.get('/business/my-business');
            setMyBusiness(businessRes.data.business);
        } catch (err) {
            alert('נכשלנו בשמירת השירות.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteService = async (serviceId: number) => {
        const ok = await showConfirm({
            title: 'מחיקת שירות מהמחירון',
            message: 'האם למחוק שירות זה מהמחירון?',
            confirmText: 'כן, מחק שירות',
            cancelText: 'ביטול',
            isDanger: true,
        });
        if (!ok) return;

        try {
            await axiosClient.delete(`/business/services/${serviceId}`);
            alert('השירות נמחק בהצלחה!');
            const businessRes = await axiosClient.get('/business/my-business');
            setMyBusiness(businessRes.data.business);
        } catch (err) {
            alert('נכשלנו במחיקת השירות.');
        }
    };

    const startEditService = (service: any) => {
        setEditingServiceId(service.id);
        setServiceName(service.name);
        setServicePrice(String(service.price));
        setServiceDuration(String(service.durationMinutes));
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-right" dir="rtl">
            <h3 className="text-base font-black text-gray-900 mb-1.5 text-right">
                {editingServiceId ? '📝 עריכת ועדכון שירות' : '✂️ ניהול שירותים ומחירון'}
            </h3>
            <form onSubmit={handleAddOrUpdateService} className="space-y-3 mb-4 border-b pb-4">
                <input type="text" placeholder="שם הטיפול" required value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs font-semibold text-right" />
                <div className="flex gap-2">
                    <input type="number" placeholder="מחיר" required value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl text-xs text-right" />
                    <select value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} className="w-32 px-3 py-2 border rounded-xl text-xs font-bold text-gray-700 bg-white text-right">
                        <option value="15">15 דק'</option>
                        <option value="30">30 דק'</option>
                        <option value="45">45 דק'</option>
                        <option value="60">60 דק'</option>
                    </select>
                </div>
                <button type="submit" disabled={loading} className="w-full py-2 bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-sm text-center">
                    {editingServiceId ? 'עדכן ושמור שינויים' : 'הוסף שירות למחירון'}
                </button>
                {editingServiceId && (
                    <button type="button" onClick={() => { setEditingServiceId(null); setServiceName(''); setServicePrice(''); }} className="w-full mt-1 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl text-center">ביטול עריכה</button>
                )}
            </form>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {myBusiness.services?.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 rounded-xl border">
                        <div className="text-right">
                            <span className="font-bold text-gray-800 block text-right">{s.name} ({s.durationMinutes} דק')</span>
                            <span className="font-black text-cyan-600 block text-right mt-0.5">₪{s.price}</span>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => startEditService(s)} className="text-[10px] text-blue-500 font-bold p-1 cursor-pointer">ערוך</button>
                            <button type="button" onClick={() => handleDeleteService(s.id)} className="text-[10px] text-red-500 font-bold p-1 cursor-pointer">מחק</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WorkingHoursPanel: React.FC<{ myBusiness: any, setMyBusiness: any }> = ({ myBusiness, setMyBusiness }) => {
    const [hoursList, setHoursList] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const daysNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

    useEffect(() => {
        if (myBusiness?.workingHours) {
            setHoursList([...myBusiness.workingHours].sort((a, b) => a.day - b.day));
        }
    }, [myBusiness]);

    const handleToggleDay = (index: number) => {
        setHoursList(prev => prev.map((h, i) => i === index ? { ...h, isOpen: !h.isOpen } : h));
    };

    const handleTimeChange = (index: number, field: string, value: string) => {
        setHoursList(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
    };

    const handleSaveHours = async () => {
        try {
            setLoading(true);
            await axiosClient.put(`/business/${myBusiness.id}/working-hours`, { workingHours: hoursList });
            alert('שעות הפעילות של העסק עודכנו בהצלחה!');
        } catch (err) {
            alert('עדכון נכשל.');
        } finally {
            setLoading(false);
        }
    };

    if (!hoursList || hoursList.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-right" dir="rtl">
            <h3 className="text-base font-black text-gray-900 mb-1.5 text-right">📅 שעות פעילות העסק</h3>
            <p className="text-[11px] text-gray-400 font-medium mb-3 text-right">הגדר את שעות הפתיחה והסגירה הכלליות (הפסקות מוגדרות ברמת כל עובד)</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {hoursList.map((hours, index) => (
                    <div key={index} className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border text-xs">
                        <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-gray-800">{daysNames[hours.day]}</span>
                            <button type="button" onClick={() => handleToggleDay(index)} className={`px-3 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer ${hours.isOpen ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{hours.isOpen ? '● פתוח' : '○ סגור'}</button>
                        </div>
                        {hours.isOpen && (
                            <div className="mt-2 pt-2 border-t" dir="rtl">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400">פתיחה:</span><input type="time" value={hours.openTime} onChange={(e) => handleTimeChange(index, 'openTime', e.target.value)} className="w-full border rounded text-center bg-white" /></div>
                                    <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400">סגירה:</span><input type="time" value={hours.closeTime} onChange={(e) => handleTimeChange(index, 'closeTime', e.target.value)} className="w-full border rounded text-center bg-white" /></div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={handleSaveHours} disabled={loading} className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm text-center">שמור שעות פעילות העסק</button>
        </div>
    );
};

export default Dashboard;
