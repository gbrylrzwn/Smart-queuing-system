import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { UserRole } from '../types';
import Navbar from '../components/layout/Navbar';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    email: '',
    role: 'CLIENT' as UserRole,
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const loginUrl = redirectPath
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await axiosClient.post('/auth/register', formData);
      navigate(loginUrl);
    } catch (err: any) {
      setError(err.response?.data?.error || 'אירעה שגיאה בתהליך ההרשמה. נסה שנית.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col font-sans" dir="rtl">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/50">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">יצירת חשבון חדש</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">
              כבר רשום במערכת?{' '}
              <Link to={loginUrl} className="font-bold text-blue-600 hover:text-blue-500 underline">
                התחבר לחשבון קיים
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-r-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">שם מלא *</label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                placeholder="ישראל ישראלי"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">מספר טלפון *</label>
              <input
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                placeholder="0501234567"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">סיסמה *</label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                כתובת אימייל <span className="text-xs font-normal text-gray-400">(אופציונלי — לקבלת תזכורות ואישורי תורים במייל)</span>
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">סוג המשתמש במערכת</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 cursor-pointer"
              >
                <option value="CLIENT">👤 לקוח (רוצה להזמין תור)</option>
                <option value="BUSINESS_OWNER">💼 בעל עסק (מנהל יומן תורים)</option>
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all cursor-pointer"
              >
                {loading ? 'מבצע רישום...' : 'הרשמה ורישום למערכת'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
