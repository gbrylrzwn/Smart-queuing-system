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

const AppRouter: React.FC = () => {
  const { user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  useEffect(() => {
    axiosClient
      .get('/admin/settings')
      .then((res) => {
        if (res.data?.settings?.maintenanceMode) {
          setMaintenanceMode(true);
        } else {
          setMaintenanceMode(false);
        }
      })
      .catch(() => {});
  }, [user?.role]);

  const isLockedOut =
    maintenanceMode &&
    user?.role !== 'SUPER_ADMIN' &&
    window.location.pathname !== '/login';

  if (isLockedOut) {
    return <MaintenanceBanner />;
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
