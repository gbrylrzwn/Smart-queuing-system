// src/pages/CreateBusiness.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';

const CreateBusiness: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    address: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
        const response = await axiosClient.post('/business/create', formData);
       
        // 🔥 התיקון: שימוש בנתוני המשתמש המעודכנים שחזרו מהשרת ושמירתם ב-Context
        if (response.data.user && updateUser) {
          updateUser(response.data.user, localStorage.getItem('token') || undefined);
        }
        
        // מעבר חלק ללוח הבקרה
        navigate('/dashboard');
      } catch (err: any) {
  
      setError(err.response?.data?.error || 'נכשלנו בהקמת העסק. אנא מלא את כל שדות החובה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100" dir="rtl">
          
          <div className="text-center mb-8">
            <span className="text-4xl text-center block">🏬</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2 tracking-tight text-center">הקמת פרופיל עסקי חדש</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium text-center">
              הגדר את פרטי העסק שלך על מנת להתחיל לקבל תורים דיגיטליים
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium text-right" dir="rtl">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form className="space-y-5 text-right" onSubmit={handleSubmit} dir="rtl">
            <div className="text-right">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-right">שם העסק / המותג</label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-all text-right"
                placeholder="לדוגמה: מספרת גבריאל Premium"
              />
            </div>

            <div className="text-right">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-right">קטגוריית העסק</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-all text-right cursor-pointer"
              >
                <option value="">בחר קטגוריה...</option>
                <option value="HAIR_SALON">מספרה / עיצוב שיער</option>
                <option value="CLINIC">קליניקה</option>
                <option value="BEAUTY_SALON">מכון יופי וקוסמטיקה</option>
                <option value="SPA">ספא</option>
                <option value="FITNESS_STUDIO">סטודיו לכושר / אימונים</option>
              </select>
            </div>

            <div className="text-right">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-right">כתובת פיזית של העסק</label>
              <input
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-all text-right"
                placeholder="לדוגמה: הרצל 42, תל אביב"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3" dir="rtl">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-xl transition-all text-center"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all disabled:from-gray-400 disabled:to-gray-500 text-center"
              >
                {loading ? 'מקים עסק...' : 'צור עסק והמשך ←'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default CreateBusiness;
