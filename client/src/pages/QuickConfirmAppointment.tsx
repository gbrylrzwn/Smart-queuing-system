import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface QuickAppointmentData {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'PAID';
  clientConfirmed: boolean;
  staffName?: string | null;
  clientName: string;
  business: {
    id: number;
    name: string;
    address: string;
    imageUrl?: string | null;
  };
  service: {
    id: number;
    name: string;
    price: number;
    durationMinutes: number;
  };
}

const QuickConfirmAppointment: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [appointment, setAppointment] = useState<QuickAppointmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/appointments/quick-confirm/${token}`);
        setAppointment(res.data.appointment);
      } catch (err: any) {
        setError(err.response?.data?.error || 'לא ניתן לטעון את פרטי התור.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDetails();
    }
  }, [token]);

  const handleAction = async (action: 'CONFIRM' | 'CANCEL') => {
    if (!token || !appointment) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await axiosClient.post(`/appointments/quick-confirm/${token}`, { action });
      setFeedbackMessage(res.data.message);
      setAppointment({
        ...appointment,
        status: res.data.status,
        clientConfirmed: res.data.clientConfirmed
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'אירעה שגיאה בעדכון התור.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = appointment
    ? new Date(appointment.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';
    return (
        <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <h1 className="text-2xl font-extrabold">אישור הגעה לתור</h1>
              <p className="text-indigo-100 text-sm mt-1">אישור מהיר בלחיצת כפתור אחת</p>
            </div>
    
            <div className="p-6">
              {loading ? (
                <div className="text-center py-10 text-slate-500 font-medium">טוען פרטי תור...</div>
              ) : error && !appointment ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-red-600 font-bold">{error}</p>
                  <Link
                    to="/"
                    className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition"
                  >
                    מעבר לדף הבית
                  </Link>
                </div>
              ) : appointment ? (
                <div className="space-y-5">
                  <div className="text-center">
                    <p className="text-slate-600 text-sm">שלום <span className="font-bold text-slate-900">{appointment.clientName}</span>,</p>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">{appointment.business.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{appointment.business.address}</p>
                  </div>
    
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">שירות:</span>
                      <span className="font-bold text-slate-800">{appointment.service.name}</span>
                    </div>
                    {appointment.staffName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">איש צוות:</span>
                        <span className="font-bold text-slate-800">{appointment.staffName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">תאריך:</span>
                      <span className="font-bold text-slate-800">{formattedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">שעה:</span>
                      <span className="font-bold text-indigo-600">{appointment.startTime} - {appointment.endTime}</span>
                    </div>
                  </div>
    
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium text-center">
                      {error}
                    </div>
                  )}
    
                  {feedbackMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-sm font-bold text-center">
                      {feedbackMessage}
                    </div>
                  )}
    
                  {appointment.status === 'CANCELED' ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-3">
                      <p className="text-red-700 font-bold">תור זה בוטל.</p>
                      <Link
                        to={`/business/${appointment.business.id}`}
                        className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
                      >
                        קביעת תור חדש בעסק
                      </Link>
                    </div>
                  ) : appointment.status === 'PAID' ? (
                    <div className="bg-slate-100 rounded-2xl p-4 text-center text-slate-700 font-bold">
                      תור זה כבר הושלם. תודה שביקרת אצלנו!
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {appointment.clientConfirmed ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 font-extrabold">
                          ✅ הגעתך מאושרת! מחכים לראותך.
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleAction('CONFIRM')}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md transition"
                        >
                          {submitting ? 'מעדכן...' : '✅ כן, אני מגיע/ה'}
                        </button>
                      )}
    
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleAction('CANCEL')}
                        className="w-full py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 disabled:opacity-50 font-bold rounded-2xl transition"
                      >
                        ❌ לא אוכל להגיע (ביטול תור)
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    };
    
    export default QuickConfirmAppointment;
    