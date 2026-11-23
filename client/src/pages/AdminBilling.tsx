import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

const AdminBilling: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any>({
    summary: { totalCollected: 0, totalPending: 0, totalFailed: 0 },
    payments: [],
  });
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('99');
  const [payMethod, setPayMethod] = useState<string>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState<string>('');
  const [payStatus, setPayStatus] = useState<string>('PAID');
  const [payDueDate, setPayDueDate] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchBillingAndBusinesses = async () => {
    try {
      setLoading(true);
      const [overviewRes, billingRes] = await Promise.all([
        axiosClient.get('/admin/overview'),
        axiosClient.get('/admin/billing'),
      ]);
      const bizList = overviewRes.data.businesses || [];
      setBusinesses(bizList);
      setBillingData(billingRes.data);

      if (bizList.length > 0 && !selectedBizId) {
        setSelectedBizId(String(bizList[0].id));
        setPayAmount(String(bizList[0].monthlyFee ?? 99));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'אין לך הרשאה לצפות בעמוד הגבייה.');
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
    fetchBillingAndBusinesses();
  }, [user?.id, user?.role]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBizId || !payAmount) return;
    try {
      setSubmitting(true);
      const res = await axiosClient.post('/admin/billing', {
        businessId: Number(selectedBizId),
        amount: Number(payAmount),
        paymentMethod: payMethod,
        referenceNumber: payRef,
        status: payStatus,
        dueDate: payDueDate || null,
        notes: payNotes,
      });
      alert(res.data?.message || 'התקבול נשמר בהצלחה!');
      setPayRef('');
      setPayNotes('');
      await fetchBillingAndBusinesses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו ברישום הגבייה.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkStatus = async (paymentId: number, status: 'PAID' | 'FAILED') => {
    try {
      const res = await axiosClient.put(`/admin/billing/${paymentId}/status`, { status });
      alert(res.data?.message || 'סטטוס התשלום עודכן.');
      await fetchBillingAndBusinesses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בעדכון הסטטוס.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-sm font-black text-gray-600">טוען נתוני גבייה ותשלומים...</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* כותרת עליונה וכפתור חזרה לניהול הראשי */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-xs border border-gray-100">
            <div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full">
                💳 קופה והנהלת חשבונות (Super Admin)
              </span>
              <h1 className="text-2xl font-black text-gray-900 mt-2">
                מרכז גבייה, תקבולים והסדרת מנויים
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                תיעוד העברות בנקאיות, צ׳קים, ביט/פייבוקס, שליחת דרישות תשלום והפעלת מנויים אוטומטית.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                ← חזרה למרכז השליטה
              </button>
              <button
                type="button"
                onClick={fetchBillingAndBusinesses}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                🔄 רענן קופה
              </button>
            </div>
          </div>

          {/* כרטיסי סיכום קופת הפלטפורמה */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg">
              <p className="text-xs font-bold text-emerald-100">סך כספים שנפרעו לחשבון הבנק</p>
              <p className="text-3xl font-black mt-2">
                ₪{billingData.summary.totalCollected.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-100 mt-1">תקבולים מאושרים שנכנסו לקופה</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs">
              <p className="text-xs font-bold text-amber-700">צ׳קים דחויים ודרישות בהמתנה</p>
              <p className="text-3xl font-black text-amber-600 mt-2">
                ₪{billingData.summary.totalPending.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">ממתינים לפירעון / אישור העברה</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-xs">
              <p className="text-xs font-bold text-red-600">חיובים שחזרו / נכשלו</p>
              <p className="text-3xl font-black text-red-500 mt-2">
                ₪{billingData.summary.totalFailed.toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">דורשים הסדרה מול בעל העסק</p>
            </div>
          </div>
          <form
            onSubmit={handleCreatePayment}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4"
          >
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-black text-gray-900">
                ➕ תיעוד גבייה חדשה / הפקת דרישת תשלום לעסק
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                בחר עסק והזן פרטי תשלום — סימון כ"שולם ונפרע" יפעיל את מנוי העסק אוטומטית.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">בחר עסק משלם</label>
                <select
                  value={selectedBizId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedBizId(id);
                    const found = businesses.find((b: any) => String(b.id) === id);
                    if (found) setPayAmount(String(found.monthlyFee ?? 99));
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white"
                >
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (₪{b.monthlyFee ?? 99}/חודש)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">סכום לגבייה (₪)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">אמצעי תשלום</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white"
                >
                  <option value="BANK_TRANSFER">🏦 העברה בנקאית</option>
                  <option value="CHECK">🧾 צ׳ק / צ׳ק דחוי</option>
                  <option value="BIT_PAYBOX">📱 ביט / פייבוקס</option>
                  <option value="CREDIT_LINK">💳 קישור סליקת אשראי</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">סטטוס פירעון</label>
                <select
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white"
                >
                  <option value="PAID">✅ שולם ונפרע (הפעל מנוי מיד)</option>
                  <option value="PENDING">⏳ ממתין לפירעון / צ׳ק דחוי</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">
                  מספר צ׳ק / אסמכתא / 4 ספרות
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="לדוגמה: אסמכתא 482910"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-gray-700 mb-1">
                  תאריך פירעון (לצ׳ק דחוי)
                </label>
                <input
                  type="date"
                  value={payDueDate}
                  onChange={(e) => setPayDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black text-gray-700 mb-1">הערות פנימיות</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="פירוט בנק, סניף או הערת גבייה..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const biz = businesses.find((b: any) => String(b.id) === selectedBizId);
                  if (!biz) return;
                  const rawPhone = (biz.owner?.phone || '').replace(/\D/g, '');
                  const intlPhone = rawPhone.startsWith('0') ? '972' + rawPhone.slice(1) : rawPhone;
                  const text = `היי ${biz.owner?.name || ''}, מצורפת דרישת תשלום עבור מנוי SmartQueue לעסק "${biz.name}" על סך ₪${payAmount}. נשמח לאישור העברה / הסדרה.`;
                  const waBase = 'https://' + 'wa.me/';
                  window.open(waBase + intlPhone + '?text=' + encodeURIComponent(text), '_blank');
                }}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                📲 שלח דרישת תשלום בוואטסאפ לעסק
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                {submitting ? 'שומר...' : '💾 שמור תקבול / דרישת תשלום'}
              </button>
            </div>
          </form>
          <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                יומן תקבולים והפקדות ({billingData.payments.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-500 font-black border-b">
                  <tr>
                    <th className="py-3.5 px-4">תאריך</th>
                    <th className="py-3.5 px-4">שם העסק</th>
                    <th className="py-3.5 px-4">אמצעי תשלום</th>
                    <th className="py-3.5 px-4">אסמכתא / צ׳ק</th>
                    <th className="py-3.5 px-4">סכום (₪)</th>
                    <th className="py-3.5 px-4">סטטוס פירעון</th>
                    <th className="py-3.5 px-4">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billingData.payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-bold">
                        טרם נרשמו תקבולים ביומן הגבייה.
                      </td>
                    </tr>
                  ) : (
                    billingData.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-gray-600 font-bold">
                          {new Date(p.createdAt).toLocaleDateString('he-IL')}
                        </td>
                        <td className="py-3.5 px-4 font-black text-gray-900">{p.business?.name}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-700">
                          {p.paymentMethod === 'BANK_TRANSFER'
                            ? '🏦 העברה בנקאית'
                            : p.paymentMethod === 'CHECK'
                            ? '🧾 צ׳ק'
                            : p.paymentMethod === 'BIT_PAYBOX'
                            ? '📱 ביט / פייבוקס'
                            : '💳 סליקת אשראי'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-bold">
                          {p.referenceNumber || '-'}
                          {p.dueDate && (
                            <span className="block text-[10px] text-amber-700">
                              פירעון: {new Date(p.dueDate).toLocaleDateString('he-IL')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-black text-indigo-600 text-sm">
                          ₪{p.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              p.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.status === 'PAID'
                              ? '✅ נפרע לחשבון'
                              : p.status === 'PENDING'
                              ? '⏳ ממתין לפירעון'
                              : '❌ נכשל / חזר'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(p.id, 'PAID')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] cursor-pointer"
                              >
                                אשר פירעון
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(p.id, 'FAILED')}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-black text-[10px] cursor-pointer"
                              >
                                חזר
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBilling;
