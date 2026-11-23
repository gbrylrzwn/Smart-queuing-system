// src/components/common/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
}

/**
 * רכיב שדה קלט גנרי לשימוש חוזר בכל טפסי האתר (Login, Register, Business)
 */
const Input: React.FC<InputProps> = ({ label, error, ...props }) => {
  return (
    <div className="w-full text-right" dir="rtl">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        className={`appearance-none rounded-md relative block w-full px-3 py-2 border ${
          error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        } placeholder-gray-400 text-gray-900 focus:outline-none sm:text-sm shadow-sm transition-colors`}
      />
      {/* הצגת הודעת שגיאה מובנית מתחת לשדה במידה והקלט אינו תקין */}
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};

export default Input;
