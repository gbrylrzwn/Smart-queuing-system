import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import axiosClient from '../../api/axiosClient';
import Navbar from '../layout/Navbar';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  enforceClientOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, enforceClientOnly }) => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspendedBusinessName, setSuspendedBusinessName] = useState<string>('');
  const [checkingSubscription, setCheckingSubscription] = useState<boolean>(false);

  useEffect(() => {
    const checkBusinessSubscription = async () => {
      if (!user || user.role !== 'BUSINESS_OWNER') {
        setIsSuspended(false);
        return;
      }

      try {
        setCheckingSubscription(true);
        const res = await axiosClient.get('/business/my-business');
        const biz = res.data?.business;
        if (biz && biz.subscriptionStatus === 'SUSPENDED') {
          setIsSuspended(true);
          setSuspendedBusinessName(biz.name || '');
        } else {
          setIsSuspended(false);
        }
      } catch {
        setIsSuspended(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkBusinessSubscription();
  }, [user]);

  if (loading || checkingSubscription) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>טוען נתונים...</h2>
      </div>
    );
  }

  if (enforceClientOnly && user && user.role !== 'CLIENT') {
    logout();
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (user.role === 'BUSINESS_OWNER' && isSuspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans" dir="rtl">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-red-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
              ⛔
            </div>
            <h1 className="text-2xl font-black text-gray-900">חשבון העסק מושעה זמנית</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              הגישה למערכת הניהול עבור <span className="font-bold">{suspendedBusinessName || 'העסק שלך'}</span> הושהתה על ידי הנהלת המערכת.
            </p>
            <p className="text-xs text-gray-400">
              לפרטים ולהסדרת המנוי אנא פנה לתמיכה הטכנית של המערכת.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
