import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

interface SmartBiPanelProps {
  myBusiness: any;
  setMyBusiness: (b: any) => void;
  selectedDate: string;
  onClose: () => void;
}

const SmartBiPanel: React.FC<SmartBiPanelProps> = ({
  myBusiness,
  setMyBusiness,
  selectedDate,
  onClose,
}) => {
  const [enabled, setEnabled] = useState<boolean>(myBusiness?.smartBiEnabled ?? true);
  const [maxNoShows, setMaxNoShows] = useState<number>(myBusiness?.maxNoShowsAllowed ?? 2);
  const [discountPercent, setDiscountPercent] = useState<number>(myBusiness?.flashDiscountPercent ?? 0);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  const [candidatesData, setCandidatesData] = useState<any>(null);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [sendingToId, setSendingToId] = useState<number | null>(null);

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const res = await axiosClient.get(`/smart-bi/gap-candidates?date=${selectedDate}`);
      setCandidatesData(res.data);
    } catch {
      setCandidatesData({ candidates: [] });
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchCandidates();
    }
  }, [selectedDate, enabled]);

  const handleSaveSettings = async (nextEnabled = enabled, nextMax = maxNoShows, nextDiscount = discountPercent) => {
    try {
      setSavingSettings(true);
      await axiosClient.put('/business/update-my-business', {
        ...myBusiness,
        smartBiEnabled: nextEnabled,
        maxNoShowsAllowed: nextMax,
        flashDiscountPercent: nextDiscount,
      });
      setMyBusiness({
        ...myBusiness,
        smartBiEnabled: nextEnabled,
        maxNoShowsAllowed: nextMax,
        flashDiscountPercent: nextDiscount,
      });
    } catch {
      alert('נכשלנו בשמירת הגדרות הבינה העסקית.');
    } finally {
      setSavingSettings(false);
    }
  };

  const buildOfferMessage = (clientName: string) => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('he-IL');
    const bookingUrl = `${window.location.origin}/business/${myBusiness.id}`;
    const discountText =
      discountPercent > 0 ? ` עם הטבת בזק של ${discountPercent}% הנחה למקדימים לתפוס!` : '!';
    return `היי ${clientName}, התפנה אצלנו ב-${myBusiness.name} חלון פנוי לתאריך ${formattedDate}${discountText}\nלקביעת התור בקליק:\n${bookingUrl}`;
  };

  const handleSendDirect = async (client: any, channel: 'SMS' | 'EMAIL') => {
    try {
      setSendingToId(client.id);
      const message = buildOfferMessage(client.name);
      const res = await axiosClient.post('/smart-bi/send-flash-offer', {
        channel,
        phone: client.phone,
        email: client.email,
        message,
      });
      alert(res.data?.message || 'ההצעה נשלחה בהצלחה!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'נכשלנו בשליחת ההודעה.');
    } finally {
      setSendingToId(null);
    }
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
        {/* כותרת ומתג הפעלה ראשי */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-l from-indigo-50/80 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full">
              ⚡ בינה עסקית ומגן הברזות
            </span>
            <h2 className="text-lg font-black text-gray-900 mt-1">
              ממלא חורים אוטומטי והגנת יומן ({new Date(selectedDate).toLocaleDateString('he-IL')})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEnabled(val);
                  handleSaveSettings(val, maxNoShows, discountPercent);
                }}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-xs font-black text-gray-800">
                {enabled ? '🟢 המערכת פעילה' : '⚪ המערכת כבויה'}
              </span>
            </label>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black rounded-xl cursor-pointer"
            >
              ✕ סגור
            </button>
          </div>
        </div>

        {/* הגדרות איזון */}
        <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-gray-700 mb-1">
              🛡️ סף הברזות למעבר לאישור ידני:
            </label>
            <select
              value={maxNoShows}
              disabled={!enabled || savingSettings}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxNoShows(val);
                handleSaveSettings(enabled, val, discountPercent);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-900"
            >
              <option value={1}>אחרי הברזה 1</option>
              <option value={2}>אחרי 2 הברזות (מומלץ)</option>
              <option value={3}>אחרי 3 הברזות</option>
              <option value={5}>אחרי 5 הברזות</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-700 mb-1">
              🏷️ הנחת בזק למילוי חור של הרגע האחרון:
            </label>
            <select
              value={discountPercent}
              disabled={!enabled || savingSettings}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDiscountPercent(val);
                handleSaveSettings(enabled, maxNoShows, val);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-900"
            >
              <option value={0}>0% — עדכון על תור פנוי ללא הנחה</option>
              <option value={10}>10% הנחת בזק</option>
              <option value={15}>15% הנחת בזק</option>
              <option value={20}>20% הנחת בזק</option>
              <option value={25}>25% הנחת בזק</option>
            </select>
          </div>
        </div>

        {/* רשימת מועמדים למילוי חור */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {!enabled ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400">
              הבינה העסקית כבויה כרגע. הפעל את המתג למעלה כדי לסרוק חורים ולקבל המלצות למילוי היומן.
            </div>
          ) : loadingCandidates ? (
            <div className="text-center py-10 text-xs font-black text-indigo-600 animate-pulse">
              סורק את היסטוריית הלקוחות ומאתר מועמדים למילוי היומן...
            </div>
          ) : !candidatesData?.candidates?.length ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              לא נמצאו כרגע לקוחות מומלצים נוספים לתאריך זה (כל הלקוחות הקבועים כבר משובצים או ביקרו לאחרונה).
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-gray-800">
                  🎯 נמצאו {candidatesData.candidates.length} לקוחות מומלצים למילוי חלון פנוי:
                </p>
                <button
                  type="button"
                  onClick={fetchCandidates}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  🔄 סרוק מחדש
                </button>
              </div>

              {candidatesData.candidates.map((c: any) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">{c.name}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                        אמינות {c.reliabilityScore ?? 100}%
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-indigo-700 mt-0.5">{c.reason}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      📞 {c.phone || 'ללא נייד'} • ✉️ {c.email || 'ללא מייל'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          const raw = c.phone.replace(/\D/g, '');
                          const intl = raw.startsWith('0') ? '972' + raw.slice(1) : raw;
                          const text = buildOfferMessage(c.name);
                          const waBase = 'https://' + 'wa.me/';
                          window.open(waBase + intl + '?text=' + encodeURIComponent(text), '_blank');
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl cursor-pointer"
                      >
                        📲 וואטסאפ
                      </button>
                    )}

                    {c.phone && (
                      <button
                        type="button"
                        disabled={sendingToId === c.id}
                        onClick={() => handleSendDirect(c, 'SMS')}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl cursor-pointer"
                      >
                        💬 SMS
                      </button>
                    )}

                    {c.email && (
                      <button
                        type="button"
                        disabled={sendingToId === c.id}
                        onClick={() => handleSendDirect(c, 'EMAIL')}
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-black rounded-xl cursor-pointer"
                      >
                        ✉️ אימייל
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartBiPanel;
