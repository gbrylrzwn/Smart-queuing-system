import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import { showConfirm } from '../components/common/GlobalAlertModal';

const BusinessHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [financialData, setFinancialData] = useState<any>(null);
  const [businessInfo, setBusinessBusiness] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessHomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. שליפת פרופיל העסק המעודכן
      const businessRes = await axiosClient.get('/business/my-business');
      const bData = businessRes.data.business;
      setBusinessBusiness(bData);

      // 2. שליפת הדוח הכספי מה-Endpoint הפיננסי
      const financeRes = await axiosClient.get('/appointments/financial-report');
      setFinancialData(financeRes.data);

            // 3. הגדרת תאריך היום ושליפת התורים בסדר הכרונולוגי הנכון עם העברת Token מאובטח
            if (bData) {
                const todayStr = new Date().toISOString().split('T')[0]; // מפיק תאריך בפורמט YYYY-MM-DD
                
                // שליפת הטוקן מה-localStorage כדי למנוע חסימת 401 מה-Middleware של השרת
                const token = localStorage.getItem('token'); 
                
                const appRes = await axiosClient.get(`/appointments/business/${bData.id}?date=${todayStr}`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                setTodayAppointments(appRes.data.appointments || []);
              }
        

    } catch (err: any) {
      console.error("Error loading business home:", err);
      setError('נכשלנו בטעינת נתוני הבית של העסק. אנא ודא שהשרת פעיל.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessHomeData();
  }, []);

  const handleMarkAsPaid = async (appId: number, price: number) => {
    const ok = await showConfirm({
        title: 'אישור קבלת תשלום',
        message: `האם לאשר קבלת תשלום על סך ₪${price}?`,
        confirmText: 'כן, אשר תשלום',
        cancelText: 'ביטול',
        isDanger: false,
      });
      if (!ok) return;
  
    try {
      await axiosClient.put(`/appointments/${appId}/mark-as-paid`);
      alert('התשלום נקלט בהצלחה והתווסף למרכז הפיננסי!');
      fetchBusinessHomeData(); // ריענון דינמי מיידי של המסך
    } catch (err) {
      alert('נכשלנו בעדכון התשלום בשרת.');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500 font-sans">טוען את מרכז הניהול העסקי...</div>;

  if (!businessInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
        <Navbar />
        <div className="text-center py-16 bg-white rounded-3xl border max-w-xl mx-auto p-8 mt-12 shadow-sm">
          <span className="text-4xl block mb-4 text-center">🏬</span>
          <h3 className="text-xl font-black text-gray-900 mb-2">טרם הוקם פרופיל עסקי במערכת</h3>
          <p className="text-xs text-gray-400 mb-6">כדי לראות נתונים פיננסיים וגרפים, עליך להקים פרופיל עסק תחילה.</p>
          <button onClick={() => navigate('/create-business')} className="py-2.5 px-6 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md">הקם עסק עכשיו</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
        
        {/* כותרת ברוכים הבאים יוקרתית */}
        <div className="mb-8 text-right bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
          <h1 className="text-2xl font-black text-gray-900">מרכז ניהול עסקי פרימיום</h1>
          <p className="text-xs text-gray-400 mt-1">שלום <span className="font-bold text-gray-700">{user?.name}</span> | עסק אקטיבי: <span className="font-bold text-blue-600">{businessInfo.name}</span></p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs text-right">{error}</div>}

        {/* 💵 כרטיסי KPI פיננסיים ותפעוליים */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
            <span className="text-[10px] uppercase font-black tracking-wide text-emerald-100 block">💵 הכנסה בפועל (סולק)</span>
            <span className="text-2xl font-black block mt-2">₪{financialData?.confirmedCash || 0}</span>
            <span className="text-[9px] text-emerald-50 block mt-1">מתוך {financialData?.paidAppointmentsCount || 0} תורים ששולמו</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs relative text-right">
            <span className="text-[10px] uppercase font-black tracking-wide text-gray-400 block">📈 צפי הכנסות משוער</span>
            <span className="text-2xl font-black block mt-2 text-gray-800">₪{financialData?.estimatedRevenue || 0}</span>
            <span className="text-[9px] text-gray-400 block mt-1">פוטנציאל מכלל התורים ביומן</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs relative text-right">
            <span className="text-[10px] uppercase font-black tracking-wide text-gray-400 block">📅 סך הכל תורים</span>
            <span className="text-2xl font-black block mt-2 text-blue-600">{financialData?.totalAppointments || 0}</span>
            <span className="text-[9px] text-gray-400 block mt-1">תורים משוריינים במערכת</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs relative text-right">
            <span className="text-[10px] uppercase font-black tracking-wide text-gray-400 block">👥 אנשי צוות פעילים</span>
            <span className="text-2xl font-black block mt-2 text-purple-600">{businessInfo.staff?.length || 0}</span>
            <span className="text-[9px] text-gray-400 block mt-1">עובדים מסונכרנים ביומן</span>
          </div>

        </div>

        {/* 📈 פילוח כספי נוכחי - בפועל מול פוטנציאל */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs mb-8 text-right">
          <h3 className="text-sm font-black text-gray-800 mb-6">📈 פילוח כספי נוכחי - בפועל מול פוטנציאל</h3>
          
          <div className="space-y-4 max-w-xl" dir="rtl">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-emerald-600">💵 מזומן אקטיבי שנכנס</span>
                <span className="text-gray-700">₪{financialData?.confirmedCash || 0}</span>
              </div>
              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${financialData?.estimatedRevenue ? (financialData.confirmedCash / financialData.estimatedRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-gray-400">📊 פוטנציאל תורים פתוח ביומן</span>
                <span className="text-gray-700">₪{financialData?.estimatedRevenue || 0}</span>
              </div>
              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-full" />
              </div>
            </div>
          </div>
        </div>

     

        {/* 🚀 כפתורי ניווט ופעולה פרימיום למרכזי הניהול השונים */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8" dir="rtl">
          
          <button 
            type="button"
            onClick={() => navigate('/financial-analytics')} 
            className="p-5 bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer text-right flex items-center justify-between group border border-slate-700 w-full"
          >
            <div className="text-right">
              <span className="text-sm font-black block">📊 מרכז אנליטיקה וגרפים פיננסיים</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">צפייה במגמות חודשיות, עליות וירידות בהכנסות, דוחות גבייה ומצעד הטיפולים</span>
            </div>
            <span className="text-xl transition-transform group-hover:translate-x-[-4px] pr-2">◀</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/dashboard')} 
            className="p-5 bg-white border border-gray-200 text-gray-800 rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer text-right flex items-center justify-between group hover:border-blue-500 w-full"
          >
            <div className="text-right">
              <span className="text-sm font-black block text-gray-900 group-hover:text-blue-600 transition-colors">🗓️ ניהול יומן ותורים מפורט</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">אישור וביטול תורים, ניהול אילוצי שעות פעילות וצוות עובדים</span>
            </div>
            <span className="text-xl text-gray-400 group-hover:text-blue-600 pr-2">◀</span>
          </button>

        </div>

      </main>
    </div>
  );
};

export default BusinessHome;

