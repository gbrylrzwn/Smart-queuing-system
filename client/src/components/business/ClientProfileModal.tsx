import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

interface ClientProfileModalProps {
  businessId: number;
  businessName: string;
  clientId: number;
  onClose: () => void;
}

const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  businessId,
  businessName,
  clientId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'NOTES' | 'FORMS'>('HISTORY');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newNote, setNewNote] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const fetchClientFile = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/crm/business/${businessId}/client/${clientId}`);
      setData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בטעינת תיק הלקוח.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientFile();
  }, [businessId, clientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSavingNote(true);
      await axiosClient.post('/crm/notes', {
        businessId,
        clientId,
        content: newNote.trim(),
      });
      setNewNote('');
      await fetchClientFile();
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בשמירת ההערה.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await axiosClient.delete(`/crm/notes/${noteId}`);
      await fetchClientFile();
    } catch {
      alert('נכשלנו במחיקת ההערה.');
    }
  };

  const sendHealthFormLink = () => {
    const rawPhone = (data?.client?.phone || '').replace(/\D/g, '');
    const intlPhone = rawPhone.startsWith('0') ? '972' + rawPhone.slice(1) : rawPhone;
    const formUrl = `${window.location.origin}/health-form/${businessId}`;
    const text = `היי ${data?.client?.name || ''}, לקראת הטיפול שלך ב-${businessName}, נשמח שתמלא/י ותחתום/י על הצהרת בריאות דיגיטלית בקישור הבא:\n${formUrl}`;
    const waBase = 'https://' + 'wa.me/';
    window.open(waBase + intlPhone + '?text=' + encodeURIComponent(text), '_blank');
  };

  return (
    <div
      dir="rtl"
      style={{ zIndex: 9999 }}
      className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !data ? (
          <div className="p-12 text-center text-sm font-black text-gray-600">טוען תיק לקוח דיגיטלי...</div>
        ) : (
          <>
            {/* כותרת כרטיס לקוח */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center">
                  {data.client.name?.charAt(0) || 'ל'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{data.client.name}</h2>
                  <p className="text-xs text-gray-500 font-bold">
                    📞 {data.client.phone || 'ללא טלפון'} • ✉️ {data.client.email || 'ללא מייל'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {data.client.phone && (
                  <button
                    type="button"
                    onClick={sendHealthFormLink}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    📲 שלח קישור להצהרת בריאות
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black rounded-xl cursor-pointer"
                >
                  ✕ סגור
                </button>
              </div>
            </div>
            {/* סרגל לשוניות התיק */}
            <div className="px-6 pt-3 border-b border-gray-100 flex items-center gap-2 bg-white">
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                📅 היסטוריית ביקורים ({data.appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('NOTES')}
                className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === 'NOTES'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                📝 הערות מטפל פרטיות ({data.notes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FORMS')}
                className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === 'FORMS'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                ✍️ הצהרות בריאות וטפסים ({data.forms.length})
              </button>
            </div>

            {/* גוף התיק */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'HISTORY' && (
                <div className="space-y-2.5">
                  {data.appointments.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs font-bold py-8">אין היסטוריית ביקורים קודמת.</p>
                  ) : (
                    data.appointments.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-900">
                            {new Date(app.date).toLocaleDateString('he-IL')} • שעה {app.startTime}
                          </p>
                          <p className="text-[11px] text-gray-600 font-bold mt-0.5">
                            טיפול: {app.service?.name || 'שירות'} {app.staff?.name ? `(מטפל/ת: ${app.staff.name})` : ''}
                          </p>
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black text-indigo-600 block">₪{app.service?.price || 0}</span>
                          <span className="text-[10px] font-bold text-gray-500">{app.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'NOTES' && (
                <div className="space-y-4">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="הוסף הערה פרטית (רגישויות, נוסחת צבע, העדפות טיפול)..."
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={savingNote}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer"
                    >
                      {savingNote ? 'שומר...' : '+ הוסף הערה'}
                    </button>
                  </form>

                  <div className="space-y-2.5">
                    {data.notes.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs font-bold py-6">
                        טרם נוספו הערות פרטיות עבור לקוח זה.
                      </p>
                    ) : (
                      data.notes.map((n: any) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-900 whitespace-pre-line">{n.content}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.createdAt).toLocaleString('he-IL')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-[11px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                          >
                            מחק
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'FORMS' && (
                <div className="space-y-3">
                  {data.forms.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs font-bold py-8">
                      טרם מולאה הצהרת בריאות עבור לקוח זה. השתמש בכפתור הירוק למעלה לשליחת טופס ללקוח.
                    </p>
                  ) : (
                    data.forms.map((form: any) => {
                      let parsedAnswers: any = {};
                      try {
                        parsedAnswers = JSON.parse(form.answersJson || '{}');
                      } catch {}
                      return (
                        <div key={form.id} className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <span className="text-xs font-black text-gray-900">{form.formTitle}</span>
                            <span className="text-[11px] text-emerald-700 font-bold">
                              ✅ נחתם בתאריך {new Date(form.signedAt).toLocaleString('he-IL')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 space-y-1">
                            <p><span className="font-bold">רגישויות / אלרגיות:</span> {parsedAnswers.allergies || 'אין'}</p>
                            <p><span className="font-bold">מצב רפואי מיוחד / הריון:</span> {parsedAnswers.medicalNotes || 'תקין'}</p>
                          </div>
                          {form.signatureDataUrl && (
                            <div className="pt-2">
                              <p className="text-[10px] text-gray-400 font-bold mb-1">חתימה דיגיטלית מאושרת:</p>
                              <img
                                src={form.signatureDataUrl}
                                alt="חתימת לקוח"
                                className="h-16 border border-gray-200 rounded-xl bg-gray-50 px-3"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientProfileModal;
