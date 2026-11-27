import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import axiosClient from '../api/axiosClient';
import { SmartQueueLogo } from '../components/common/SmartQueueLogo';

interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  appointmentId?: number | null;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientTaxId?: string | null;
  serviceName: string;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
  issuedAt: string;
  beforeVat?: number;
  vatAmount?: number;
  digitalSeal?: string;

}

const BusinessInvoices: React.FC = () => {
  const [business, setBusiness] = useState<any>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [paidAppointments, setPaidAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientTaxId, setClientTaxId] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('אשראי / העברה');
  const [notes, setNotes] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceItem | null>(null);
  const fetchInvoicesData = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/invoices/my');
      setBusiness(res.data.business);
      setInvoices(res.data.invoices || []);
      setPaidAppointments(res.data.paidAppointments || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בטעינת נתוני החשבוניות.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoicesData();
  }, []);

  const handleSelectAppointment = (appIdStr: string) => {
    setSelectedAppId(appIdStr);
    if (!appIdStr) return;
    const found = paidAppointments.find((a) => String(a.id) === appIdStr);
    if (found) {
      setClientName(found.client?.name || '');
      setClientPhone(found.client?.phone || '');
      setServiceName(found.service?.name || '');
      setAmount(String(found.service?.price || ''));
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await axiosClient.post('/invoices/create', {
        appointmentId: selectedAppId ? Number(selectedAppId) : null,
        clientName,
        clientPhone,
        clientTaxId,
        serviceName,
        amount: Number(amount),
        paymentMethod,
        notes,
      });
      setSelectedAppId('');
      setClientName('');
      setClientPhone('');
      setClientTaxId('');
      setServiceName('');
      setAmount('');
      setNotes('');
      await fetchInvoicesData();
      if (res.data?.invoice) {
        setPreviewInvoice(res.data.invoice);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בהפקת החשבונית.');
    } finally {
      setSubmitting(false);
    }
  };
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.serviceName.toLowerCase().includes(q)
    );
  });

  const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-full mb-2">
              מסמכים פיננסיים מאובטחים | הפרדת נתונים מלאה
            </span>
            <h1 className="text-2xl font-black text-slate-900">הפקת חשבוניות וקבלות ללקוחות</h1>
            <p className="text-xs text-slate-500 mt-1">
              הפקת מסמכים רשמיים עבור {business?.name || 'העסק שלך'} — גלויים ונגישים אך ורק לך.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl text-right">
            <span className="text-[11px] font-bold text-emerald-700 block">סה"כ הופק בחשבוניות</span>
            <span className="text-xl font-black text-emerald-900">₪{totalInvoicedAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateInvoice}
            className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4 h-fit"
          >
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              הפקת חשבונית / קבלה חדשה
            </h2>

            {paidAppointments.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  מילוי אוטומטי מתור ששולם (אופציונלי)
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => handleSelectAppointment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- בחר תור ששולם למילוי מהיר --</option>
                  {paidAppointments.map((app) => (
                    <option key={app.id} value={app.id}>
                      {new Date(app.date).toLocaleDateString('he-IL')} | {app.client?.name} — {app.service?.name} (₪{app.service?.price})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">שם הלקוח *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">טלפון לקוח</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="050-0000000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ח.פ / ת.ז לקוח</label>
                <input
                  type="text"
                  value={clientTaxId}
                  onChange={(e) => setClientTaxId(e.target.value)}
                  placeholder="אופציונלי"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">תיאור השירות *</label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="לדוגמה: תספורת ועיצוב שיער"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">סכום לתשלום (₪) *</label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="120"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">אמצעי תשלום</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="אשראי / העברה">אשראי / העברה</option>
                  <option value="מזומן">מזומן</option>
                  <option value="Bit / PayBox">Bit / PayBox</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
            >
              {submitting ? 'מפיק מסמך מאובטח...' : 'הפק חשבונית / קבלה דיגיטלית'}
            </button>
          </form>
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">ארכיון חשבוניות העסק ({invoices.length})</h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי מספר מסמך, לקוח או שירות..."
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64"
              />
              <button
                type="button"
                onClick={() => {
                  const headers = ['מספר מסמך', 'תאריך', 'שם לקוח', 'טלפון', 'ח.פ/ת.ז', 'שירות', 'לפני מע"מ', 'מע"מ (18%)', 'סה"כ (₪)', 'אמצעי תשלום', 'חותמת אימות'];
                  const rows = filteredInvoices.map((inv) => [
                    inv.invoiceNumber,
                    new Date(inv.issuedAt).toLocaleDateString('he-IL'),
                    inv.clientName,
                    inv.clientPhone || '',
                    inv.clientTaxId || '',
                    inv.serviceName,
                    inv.beforeVat ?? inv.amount,
                    inv.vatAmount ?? 0,
                    inv.amount,
                    inv.paymentMethod,
                    inv.digitalSeal || '',
                  ]);
                  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer shrink-0"
              >
                📊 ייצוא לאקסל
              </button>

            </div>

            {loading ? (
              <p className="text-xs text-slate-400 text-center py-10">טוען מסמכים...</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">טרם הופקו חשבוניות התואמות לחיפוש.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-sm font-black text-slate-900">{inv.clientName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {inv.serviceName} • {new Date(inv.issuedAt).toLocaleDateString('he-IL')} ({inv.paymentMethod})
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-emerald-700">₪{inv.amount}</span>
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl cursor-pointer"
                      >
                        צפייה / הדפסה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {previewInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <SmartQueueLogo size="sm" />
                <p className="text-xs font-bold text-slate-700 mt-2">{business?.name}</p>
                <p className="text-[11px] text-slate-500">{business?.address}</p>
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                  חשבונית / קבלה מקור
                </span>
                <p className="text-sm font-black text-slate-900 mt-2">{previewInvoice.invoiceNumber}</p>
                <p className="text-[11px] text-slate-500">
                  תאריך: {new Date(previewInvoice.issuedAt).toLocaleDateString('he-IL')}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-1 text-xs">
              <p><span className="font-bold text-slate-500">לכבוד:</span> <span className="font-black text-slate-900">{previewInvoice.clientName}</span></p>
              {previewInvoice.clientPhone && <p><span className="font-bold text-slate-500">טלפון:</span> {previewInvoice.clientPhone}</p>}
              {previewInvoice.clientTaxId && <p><span className="font-bold text-slate-500">ח.פ / ת.ז:</span> {previewInvoice.clientTaxId}</p>}
              <p><span className="font-bold text-slate-500">אמצעי תשלום:</span> {previewInvoice.paymentMethod}</p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 flex justify-between">
                <span>תיאור השירות</span>
                <span>סה"כ לתשלום</span>
              </div>
              <div className="px-4 py-3 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-800">{previewInvoice.serviceName}</span>
                <span className="text-base font-black text-slate-900">₪{previewInvoice.amount}</span>
              </div>
            </div>
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>סכום לפני מע"מ:</span>
                <span className="font-bold">₪{(previewInvoice.beforeVat ?? Number(previewInvoice.amount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>מע"מ (18%):</span>
                <span className="font-bold">₪{(previewInvoice.vatAmount ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-xs pt-1 border-t border-indigo-100">
                <span>סה"כ שולם כולל מע"מ:</span>
                <span>₪{Number(previewInvoice.amount).toFixed(2)}</span>
              </div>
              {previewInvoice.digitalSeal && (
                <p className="text-[10px] font-mono text-indigo-800 pt-1">
                  🔒 חותמת שלמות קריפטוגרפית (SHA-256): {previewInvoice.digitalSeal}
                </p>
              )}
              <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
                * אישור תשלום ומסמך פירוט עסקה דיגיטלי חתום במערכת SmartQueue. להפקת חשבונית מס מוכרת לרשות המסים יש לייצא נתונים לרואה החשבון או לחבר ספק חשבוניות מוסמך.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                סגור
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
              >
                הדפסה / שמירה כ-PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessInvoices;
