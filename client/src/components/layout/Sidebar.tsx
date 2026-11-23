// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white h-full border-l border-gray-200 shadow-sm" dir="rtl">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">תפריט ניהול</h2>
      </div>
      <nav className="p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          📅 יומן תורים יומי
        </NavLink>
        
        <div className="opacity-50 pointer-events-none">
          <span className="block px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            הגדרות עסק (שלב הבא)
          </span>
          <span className="block px-4 py-2 text-sm font-medium text-gray-500">
            ⚙️ שעות פעילות ואילוצים
          </span>
          <span className="block px-4 py-2 text-sm font-medium text-gray-500">
            ✂️ ניהול שירותים ומחירים
          </span>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
