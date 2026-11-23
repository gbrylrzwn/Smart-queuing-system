import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/layout/Navbar';

const FinancialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosClient.get('/appointments/financial-report');
        setFinancialData(response.data);
      } catch (err: any) {
        console.error("Financial report fetch failed:", err);
        setError('נכשלנו בטעינת הדוח האנליטי. אנא ודא שהשרת פעיל.');
      } finally {
        setLoading(false);
      }
    };
    fetchFinancialReport();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500 font-sans">מפיק דוח פיננסי ואנליטיקת מגמות...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10" dir="rtl">
        
        {/* 📊 כותרת עמוד מינימליסטית - ללא כפתורי ניווט כפולים שכבר קיימים בהדר הראשי */}
        <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs w-full text-right" dir="rtl">
          <h1 className="text-xl font-black text-gray-900">📊 בינה עסקית ואנליטיקה כספית</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">ניתוח מקיף של ההכנסות, פילוח טיפולים רווחיים, מעקב הפסדים ומגמות צמיחה חודשיות</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs text-right">{error}</div>}

        {/* 💵 קוביות מדדי ביצוע (KPI Cards) ממוקדות */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
            <span className="text-[10px] uppercase font-black tracking-wide text-emerald-100 block">💵 הכנסה בפועל (סולק)</span>
            <span className="text-2xl font-black block mt-2">₪{financialData?.confirmedCash || 0}</span>
            <span className="text-[9px] text-emerald-50 block mt-1">מתוך {financialData?.paidAppointmentsCount || 0} תורים</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs relative text-right">
            <span className="text-[10px] uppercase font-black tracking-wide text-gray-400 block">📊 צפי הכנסות משוער</span>
            <span className="text-2xl font-black block mt-2 text-gray-800">₪{financialData?.estimatedRevenue || 0}</span>
            <span className="text-[9px] text-gray-400 block mt-1">פוטנציאל מכלל היומן</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-2xs relative text-right bg-red-50/10">
            <span className="text-[10px] uppercase font-black tracking-wide text-red-500 block">📉 הפסד מביטולים</span>
            <span className="text-2xl font-black block mt-2 text-red-600">₪{financialData?.leakedRevenue || 0}</span>
            <span className="text-[9px] text-red-400 block mt-1">נזק כספי מתורים שבוטלו</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs relative text-right">
            <span className="text-[10px] uppercase font-black tracking-wide text-gray-400 block">📈 אחוז ניצול (Fill Rate)</span>
            <span className="text-2xl font-black block mt-2 text-blue-600">
              {financialData?.totalAppointments ? Math.round(((financialData.paidAppointmentsCount || 0) / financialData.totalAppointments) * 100) : 0}%
            </span>
            <span className="text-[9px] text-gray-400 block mt-1">יחס תורים משולמים</span>
          </div>

        </div>
                    {/* 📈 מרכז אנליטיקה פיננסי - גרף עמודות דינמי מסונכרן עם צירי X ו-Y */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8 text-right">
          <h3 className="text-sm font-black text-gray-800 mb-6">📈 גרף מגמות חודשי (עליות וירידות בהכנסות)</h3>
          
          
                     {(() => {
                        // יצירת 4 החודשים האמיתיים האחרונים לפי תאריך המערכת הנוכחי
                        const realMonths: { month: string; amount: number }[] = [];
                        const now = new Date();
                        for (let i = 3; i >= 0; i--) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                          const found = financialData?.monthlyTrends?.find((t: any) => t.month === monthKey);
                          realMonths.push({
                            month: monthKey,
                            amount: found ? found.amount : 0
                          });
                        }
            
                        const trends = realMonths;
                        const maxAmount = Math.max(...trends.map((t) => t.amount)) || 200;
                        const yMax = Math.ceil(maxAmount / 50) * 50; 
                        
                        const yAxisTicks = [yMax, Math.round(yMax * 0.75), Math.round(yMax * 0.5), Math.round(yMax * 0.25), 0];
            
            return (
              <div className="flex flex-col w-full" dir="ltr">
                
                <div className="flex items-stretch h-56 w-full gap-3 relative">
                  
                  {/* ציר Y פיננסי שמאלי קבוע ומקצועי */}
                  <div className="flex flex-col justify-between items-end w-12 text-[10px] text-gray-400 font-bold select-none pr-1 pb-4">
                    {yAxisTicks.map((tick, i) => (
                      <span key={i}>₪{tick}</span>
                    ))}
                  </div>

                  {/* רשת הגרף */}
                  <div className="flex-1 h-full relative border-b border-l border-gray-200 rounded-bl-lg flex items-end justify-around px-4 gap-4 bg-gray-50/20">
                    
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-0 opacity-50">
                      <div className="border-b border-gray-100 w-full h-0" />
                      <div className="border-b border-gray-100 w-full h-0" />
                      <div className="border-b border-gray-100 w-full h-0" />
                      <div className="border-b border-gray-100 w-full h-0" />
                    </div>

                    {trends.map((trend: any, idx: number) => {
                      const barHeight = trend.amount > 0 ? (trend.amount / yMax) * 100 : 2; 
                      
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end relative group z-10">
                          
                          <div className="absolute -top-7 bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 whitespace-nowrap shadow-md">
                            ₪{trend.amount}
                          </div>

                          <div 
                            className={`w-full max-w-[36px] rounded-t-md transition-all duration-700 shadow-2xs ${
                              trend.amount > 0 
                                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                                : 'bg-gray-100 border border-dashed border-gray-200'
                            }`}
                            style={{ height: `${barHeight}%` }}
                          />

                        </div>
                      );
                    })}

                  </div>
                </div>

                {/* ציר X כרונולוגי תחתון מיושר לעמודות */}
                <div className="flex w-full pl-12 gap-3" dir="ltr">
                  <div className="flex-1 flex justify-around px-4 gap-4 mt-2">
                    {trends.map((trend: any, idx: number) => (
                      <span key={idx} className="text-[10px] text-gray-400 font-black whitespace-nowrap select-none text-center flex-1 max-w-[36px]">
                        {trend.month}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}
        </div>


        {/* 🏆 טבלת דירוג השירותים הכי מכניסים ורווחיים בעסק */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden text-right" dir="rtl">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 text-right">
            <h3 className="text-sm font-black text-gray-800">🏆 דירוג השירותים הכי מכניסים בעסק (מזומן בקופה)</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">פילוח רווחיות לפי סוגי הטיפולים שבוצעו ושולמו בפועל</p>
          </div>
          
          <div className="p-6 text-right">
            {!financialData?.topServices || financialData.topServices.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium italic py-4 text-center">אין עדיין שירותים משולמים לצורך פילוח רווחיות.</p>
            ) : (
              <div className="space-y-3" dir="rtl">
                {financialData.topServices.map((srv: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50/60 border border-gray-100 rounded-xl text-right" dir="rtl">
                    <div className="flex items-center gap-3 text-right">
                      <span className="w-5 h-5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 font-black text-[10px] flex items-center justify-center shadow-2xs">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-800 text-right">{srv.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-emerald-600 block">₪{srv.totalEarned}</span>
                      <span className="text-[9px] text-gray-400 block font-medium mt-0.5">בוצע {srv.count} פעמים</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default FinancialDashboard;
