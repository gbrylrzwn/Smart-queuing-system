import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import BusinessProfile from '../pages/BusinessProfile';
import MyAppointments from '../pages/MyAppointments';
import Favorites from '../pages/Favorites';
import Dashboard from '../pages/Dashboard';
import CreateBusiness from '../pages/CreateBusiness';
import UserProfile from '../pages/UserProfile';
import BusinessHome from '../pages/BusinessHome';
import FinancialDashboard from '../pages/FinancialDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import QuickConfirmAppointment from '../pages/QuickConfirmAppointment';
import AdminBilling from '../pages/AdminBilling';
import HealthDeclarationPage from '../pages/HealthDeclarationPage';

import ProtectedRoute from '../components/auth/ProtectedRoute';

const MaintenanceBanner: React.FC = () => (
  <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
    <div className="max-w-md bg-slate-800/90 border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-4">
      <div className="text-5xl">🛠️</div>
      <h1 className="text-2xl font-black">המערכת נמצאת בתחזוקה יזומה</h1>
      <p className="text-sm text-slate-300 leading-relaxed">
        אנו מבצעים כעת שדרוג ותחזוקה לשיפור חוויית השירות. המערכת תשוב לפעילות מלאה בעוד זמן קצר. תודה על הסבלנות!
      </p>
      <a
        href="/login"
        className="inline-block mt-4 text-xs text-slate-400 hover:text-white underline"
      >
        כניסת מנהל מערכת
      </a>
    </div>
  </div>
);

const LaunchFreezeBanner: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
    <div className="max-w-lg bg-white/10 backdrop-blur-md border border-white/15 p-8 rounded-3xl shadow-2xl space-y-5">
      <div className="text-5xl">🚀</div>
      <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-200 text-xs font-black rounded-full">
        תור חכם | SmartQueue
      </span>
      <h1 className="text-2xl sm:text-3xl font-black">המערכת עולה בקרוב באזורך!</h1>
      <p className="text-sm text-slate-200 leading-relaxed">
        אנו מצרפים כעת את העסקים ונותני השירות המובילים. בקרוב ייפתח האתר לקביעת תורים מהירה מכל מקום!
      </p>
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="/register"
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow transition"
        >
          🏢 בעל עסק? הירשם להצטרפות מוקדמת
        </a>
        <a
          href="/login"
          className="w-full sm:w-auto px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
        >
          כניסה למנויים / מנהל
        </a>
      </div>
    </div>
  </div>
);

const AppRouter: React.FC = () => {
  const { user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [launchFreezeMode, setLaunchFreezeMode] = useState<boolean>(false);

  useEffect(() => {
    axiosClient
      .get('/admin/settings')
      .then((res) => {
        setMaintenanceMode(Boolean(res.data?.settings?.maintenanceMode));
        setLaunchFreezeMode(Boolean(res.data?.settings?.launchFreezeMode));
      })
      .catch(() => {});
  }, [user?.role]);

  const currentPath = window.location.pathname;

  // 1. הקפאת תחזוקה מלאה — חוסמת את כולם מלבד מנהל המערכת ומסך ההתחברות
  if (maintenanceMode && user?.role !== 'SUPER_ADMIN' && currentPath !== '/login') {
    return <MaintenanceBanner />;
  }

  // 2. הקפאת השקה — מאפשרת לבעלי עסקים להירשם ולהתחבר, אך מקפיאה כניסת לקוחות קצה
  const isAllowedDuringLaunch =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'BUSINESS_OWNER' ||
    currentPath === '/login' ||
    currentPath === '/register';

  if (launchFreezeMode && !isAllowedDuringLaunch) {
    return <LaunchFreezeBanner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirm-appointment/:token" element={<QuickConfirmAppointment />} />

        <Route element={<ProtectedRoute allowedRoles={['CLIENT', 'BUSINESS_OWNER', 'SUPER_ADMIN']} />}>
          <Route path="/profile" element={<UserProfile />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['CLIENT']} enforceClientOnly />}>
          <Route path="/business/:id" element={<BusinessProfile />} />
          <Route path="/my-appointments" element={<MyAppointments />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/health-form/:businessId" element={<HealthDeclarationPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['BUSINESS_OWNER']} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-business" element={<CreateBusiness />} />
          <Route path="/business-home" element={<BusinessHome />} />
          <Route path="/financial-analytics" element={<FinancialDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
