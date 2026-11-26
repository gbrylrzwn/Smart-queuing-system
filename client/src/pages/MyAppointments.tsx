import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/layout/Navbar';
import { showConfirm } from '../components/common/GlobalAlertModal';

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [appToCancel, setAppToCancel] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const fetchMyAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosClient.get('/appointments/my-orders');
      setAppointments(response.data.appointments || []);
    } catch (err: any) {
      setError('נכשלנו בטעינת רשימת התורים שלך. אנא נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAppointments();
  }, []);

  const handleCancelConfirm = async () => {
    if (!appToCancel) return;
    try {
      setActionLoading(true);
      await axiosClient.put(`/appointments/${appToCancel.id}/cancel`);
      setAppointments((prev) => prev.filter((item) => item.id !== appToCancel.id));
      setAppToCancel(null);
      alert('התור בוטל בהצלחה והמשבצת שוחררה במערכת.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בביטול התור.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCard = (appointmentId: number) => {
    const handleDeleteCard = async (appointmentId: number) => {
        const ok = await showConfirm({
          title: 'הסרת כרטיסייה מהתצוגה',
          message: 'האם להסיר כרטיסייה זו מרשימת התצוגה שלך?',
          confirmText: 'כן, הסר',
          cancelText: 'ביטול',
          isDanger: true,
        });
        if (!ok) return;
        setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
      };
    
    setAppointments((prev) => prev.filter((item) => item.id !== appointmentId));
  };

  const handleInviteFriend = (app: any) => {
    const rawDate = new Date(app.date);
    const yyyy = rawDate.getFullYear();
    const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
    const dd = String(rawDate.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const displayDate = rawDate.toLocaleDateString('he-IL');

    const shareUrl = `${window.location.origin}/business/${app.businessId}?date=${isoDate}`;
    const text = `היי! קבעתי תור ל-${app.business?.name || 'העסק'} בתאריך ${displayDate} בשעה ${app.startTime}. בוא/י לקבוע תור צמוד אליי בקישור המהיר:\n${shareUrl}`;
    window.open(`https://wa.me{encodeURIComponent(text)}`, '_blank');
  };
  const buildGoogleCalendarUrl = (app: any) => {
    const d = new Date(app.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    const startTimeStr = app.startTime || '09:00';
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const duration = app.service?.durationMinutes || 30;
    const endTotalMin = sH * 60 + sM + duration;
    const eH = String(Math.floor(endTotalMin / 60)).padStart(2, '0');
    const eM = String(endTotalMin % 60).padStart(2, '0');

    const startFormatted = `${yyyy}${mm}${dd}T${String(sH).padStart(2, '0')}${String(sM).padStart(2, '0')}00`;
    const endFormatted = `${yyyy}${mm}${dd}T${eH}${eM}00`;

    const title = `תור ל-${app.service?.name || 'טיפול'} ב-${app.business?.name || 'עסק'}`;
    const details = `איש צוות: ${app.staffName || 'צוות העסק'} | נקבע דרך SmartQueue`;
    const location = app.business?.address || '';

    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    return `${base}&text=${encodeURIComponent(title)}&dates=${startFormatted}/${endFormatted}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&ctz=Asia/Jerusalem`;
  };

  const isAppointmentExpired = (app: any) => {
    const end = new Date(app.date);
    const [endH, endM] = (app.endTime || '23:59').split(':').map(Number);
    end.setHours(endH, endM, 0, 0);
    return end.getTime() <= Date.now();
  };

  const isHistoryAppointment = (app: any) =>
    app.status === 'CANCELED' || app.status === 'PAID' || isAppointmentExpired(app);

  const visibleAppointments = appointments
    .filter((app) => (activeTab === 'history' ? isHistoryAppointment(app) : !isHistoryAppointment(app)))
    .sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      if (aTime !== bTime) return activeTab === 'history' ? bTime - aTime : aTime - bTime;
      const aStart = String(a.startTime || '');
      const bStart = String(b.startTime || '');
      return activeTab === 'history' ? bStart.localeCompare(aStart) : aStart.localeCompare(bStart);
    });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans relative" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col items-center relative">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-6 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-md border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-base font-black z-30 cursor-pointer"
          title="חזרה לדף הבית"
        >
          ➔
        </button>

        <div className="w-full text-right mb-5 pr-2" dir="rtl">
          <h2 className="text-xl font-black text-gray-900 text-right">התורים שלי</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5 text-right">תורים פעילים והיסטוריית טיפולים</p>
        </div>

        <div className="w-full mb-5 grid grid-cols-2 gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm" dir="rtl" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            תורים פעילים
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            היסטוריית תורים
          </button>
        </div>

        {error && <div className="mb-6 w-full p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-xs font-bold text-right" dir="rtl">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-xs font-bold text-gray-400 animate-pulse">טוען את התורים שלך...</div>
        ) : visibleAppointments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 w-full" dir="rtl">
            <span className="text-4xl block mb-3 text-center">{activeTab === 'history' ? '🗂️' : '📱'}</span>
            <h4 className="text-sm font-bold text-gray-700 text-center">
              {activeTab === 'history' ? 'אין עדיין היסטוריית תורים' : 'אין לך תורים עתידיים'}
            </h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed text-center">
              {activeTab === 'history'
                ? 'תורים שבוטלו, שולמו או שמועדם עבר יופיעו כאן.'
                : 'כל התורים שתזמין באפליקציה יופיעו וינוהלו ישירות מתוך מסך זה.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 w-full" dir="rtl">
            {visibleAppointments.map((app) => {
              const appDate = new Date(app.date).toLocaleDateString('he-IL');
              const isCanceled = app.status === 'CANCELED';
              const isHistory = isHistoryAppointment(app); 
              const addressQuery = app.business?.address ? encodeURIComponent(app.business.address) : '';
              const wazeUrl = `https://waze.com{addressQuery}&navigate=yes`;
              
              return (
                <div 
                  key={app.id} 
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative transition-all flex flex-col justify-between text-right w-full ${
                    isCanceled ? 'opacity-50 bg-gray-50/50' : 'hover:shadow-md'
                  }`}
                  dir="rtl"
                >
                  <div className="flex items-start justify-between gap-4 w-full" dir="rtl">
                    <div className="flex-1 text-right">
                      <h4 className="text-sm font-black text-gray-900 text-right">
                        {app.staffName || 'גבריאל'} — {app.business?.name}
                      </h4>
                      <p className="text-xs font-bold text-gray-500 text-right mt-1">
                        {app.service?.name} ({app.service?.durationMinutes} דקות)
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 select-none">
                      {app.status === 'CONFIRMED' && (
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">📅 מאושר</span>
                      )}
                      {app.status === 'PENDING' && (
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs animate-pulse">⏳ בקשה פתוחה</span>
                      )}
                      {app.status === 'CANCELED' && (
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-red-50 text-red-600 border border-red-100 shadow-2xs">❌ מבוטל</span>
                      )}
                      {app.status === 'PAID' && (
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-500 text-white shadow-3xs">💵 בוצע ושולם</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50/80 space-y-1.5 text-right w-full" dir="rtl">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 text-right">
                      <span className="text-gray-400 w-16 text-right">תאריך:</span>
                      <span className="text-gray-800 text-right font-bold">{appDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 text-right">
                      <span className="text-gray-400 w-16 text-right">שעה:</span>
                      <span className="text-cyan-600 text-right font-black">{app.startTime || app.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 text-right">
                      <span className="text-gray-400 w-16 text-right">מטפל:</span>
                      <span className="text-gray-700 text-right">{app.staffName || 'גבריאל'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 text-right">
                      <span className="text-gray-400 w-16 text-right">עלות:</span>
                      <span className="text-gray-900 text-right font-black">₪{app.service?.price}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 text-right">
                      <span className="text-gray-400 w-16 text-right">כתובת:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-700 text-right truncate max-w-[150px]">{app.business?.address}</span>
                        {!isHistory && (
                          <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-sky-100 hover:bg-sky-200 text-sky-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-all active:scale-95 shadow-2xs cursor-pointer">
                            🚙 ניווט בוויז
                          </a>
                        )}
                      </div>
                    </div>

                    {isHistory && (
                      <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-end w-full">
                        <button type="button" disabled={actionLoading} onClick={() => handleDeleteCard(app.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-[10px] font-black rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-3xs cursor-pointer disabled:opacity-40">
                          🗑️ מחק כרטיס מהמסך
                        </button>
                      </div>
                    )}

                    {!isHistory && app.status !== 'PENDING' && (
                      <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 w-full">
                        <button type="button" onClick={() => handleInviteFriend(app)} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black rounded-xl transition-all active:scale-95 cursor-pointer">
                          📲שתף עם חבר
                        </button>
                        <a
                          href={buildGoogleCalendarUrl(app)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-black rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          📅 הוסף ליומן Google
                        </a>

                        <button type="button" disabled={actionLoading} onClick={() => setAppToCancel(app)} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-[10px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-40">
                          ❌ ביטול תור
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {appToCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-xl text-right">
            <h3 className="text-sm font-black text-gray-900">בטוח שברצונך לבטל?</h3>
            <p className="text-xs text-gray-400 mt-1">המשבצת תתפנה ולקוחות אחרים יוכלו לשריין אותה.</p>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setAppToCancel(null)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl">הישאר</button>
              <button onClick={handleCancelConfirm} disabled={actionLoading} className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md disabled:opacity-50">כן, בטל תור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
