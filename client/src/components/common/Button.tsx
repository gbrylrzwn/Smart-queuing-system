// src/components/common/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

/**
 * רכיב כפתור אחיד ומעוצב לכל האתר, הכולל תמיכה מובנית במצבי טעינה וחסימה
 */
const Button: React.FC<ButtonProps> = ({ children, loading, disabled, ...props }) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className="group relative block w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm transition-all text-center"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          {/* אייקון טעינה (Spinner) מבוסס SVG נקי */}
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          מעבד נתונים...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
