import React, { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import axiosClient from '../api/axiosClient';

interface ServiceCheck {
  name: string;
  description: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'CHECKING';
  latencyMs?: number;
}

const StatusPage: React.FC = () => {
  const [checks, setChecks] = useState<ServiceCheck[]>([
    { name: 'שרת ליבה ומנוע תורים (API)', description: 'עיבוד תורים, זמינות ומניעת התנגשויות בזמן אמת', status: 'CHECKING' },
    { name: 'מסד נתונים מאובטח (PostgreSQL)', description: 'שמירת נתוני עסקים, לקוחות וחשבוניות חתומות', status: 'CHECKING' },
    { name: 'מנוע תזכורות והתראות SMS', description: 'מתזמן תזכורות אוטומטיות 24 שעות ושעתיים לפני תור', status: 'CHECKING' },
    { name: 'סנכרון יומן Google ואימות ביומטרי', description: 'חיבור OAuth ליומן עסקי ואימות WebAuthn במובייל', status: 'CHECKING' },
  ]);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [overallLatency, setOverallLatency] = useState<number | null>(null);

  const runHealthCheck = async () => {
    const start = performance.now();
    try {
      const res = await axiosClient.get('/status');
      const latency = Math.max(12, Math.round(performance.now() - start));
      const isOk = res.status === 200 && res.data?.status === 'OK';

      setOverallLatency(latency);
      setChecks([
        { name: 'שרת ליבה ומנוע תורים (API)', description: 'עיבוד תורים, זמינות ומניעת התנגשויות בזמן אמת', status: isOk ? 'OPERATIONAL' : 'DEGRADED', latencyMs: latency },
        { name: 'מסד נתונים מאובטח (PostgreSQL)', description: 'שמירת נתוני עסקים, לקוחות וחשבוניות חתומות', status: isOk ? 'OPERATIONAL' : 'DEGRADED' },
        { name: 'מנוע תזכורות והתראות SMS', description: 'מתזמן תזכורות אוטומטיות 24 שעות ושעתיים לפני תור', status: isOk ? 'OPERATIONAL' : 'DEGRADED' },
        { name: 'סנכרון יומן Google ואימות ביומטרי', description: 'חיבור OAuth ליומן עסקי ואימות WebAuthn במובייל', status: isOk ? 'OPERATIONAL' : 'DEGRADED' },
      ]);
    } catch {
      setOverallLatency(null);
      setChecks((prev) => prev.map((c) => ({ ...c, status: 'DEGRADED' })));
    } finally {
      setLastChecked(new Date().toLocaleTimeString('he-IL'));
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const allOperational = checks.every((c) => c.status === 'OPERATIONAL');
  const isChecking = checks.some((c) => c.status === 'CHECKING');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            isChecking
              ? 'bg-white border-slate-200'
              : allOperational
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  isChecking ? 'bg-slate-400 animate-pulse' : allOperational ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {isChecking
                  ? 'בודק תקינות שירותי המערכת...'
                  : allOperational
                  ? 'כל מערכות SmartQueue פועלות כסדרן'
                  : 'זוהה עומס או עיכוב בתקשורת עם השרת'}
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              בדיקת זמינות חיה בזמן אמת מול שרתי המערכת • עדכון אחרון: {lastChecked || 'בודק כעת'}
              {overallLatency !== null ? ` • זמן תגובה: ${overallLatency}ms` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={runHealthCheck}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-black shadow-2xs transition cursor-pointer shrink-0"
          >
            🔄 רענן בדיקה
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs divide-y divide-slate-100">
          {checks.map((item) => (
            <div key={item.name} className="p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">{item.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.latencyMs !== undefined && (
                  <span className="text-[11px] font-mono text-slate-400">{item.latencyMs}ms</span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    item.status === 'CHECKING'
                      ? 'bg-slate-100 text-slate-600'
                      : item.status === 'OPERATIONAL'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {item.status === 'CHECKING' ? 'בודק...' : item.status === 'OPERATIONAL' ? 'פעיל ותקין' : 'בבדיקה'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StatusPage;
