import React from 'react';

interface SmartQueueLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  darkText?: boolean;
}

export const SmartQueueLogo: React.FC<SmartQueueLogoProps> = ({
  size = 'md',
  showTagline = false,
  darkText = true,
}) => {
  const iconDimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size];

  const titleSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5 select-none" dir="rtl">
      <div
        className={`${iconDimensions} rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-2 shadow-md shadow-blue-600/20 flex items-center justify-center shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://w3.org"
          className="w-full h-full"
        >
          <rect
            x="4"
            y="6"
            width="24"
            height="22"
            rx="5"
            stroke="white"
            strokeWidth="2.4"
          />
          <path
            d="M10 3.5V7.5M22 3.5V7.5"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M4.5 12.5H27.5"
            stroke="white"
            strokeOpacity="0.45"
            strokeWidth="1.8"
          />
          <path
            d="M11 19.5L14.5 23L21.5 16"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col text-right leading-none">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`${titleSize} font-black tracking-tight ${
              darkText ? 'text-slate-900' : 'text-white'
            }`}
          >
            Smart<span className="text-blue-600">Queue</span>
          </span>
          <span
            className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
              darkText
                ? 'bg-blue-50 text-blue-700'
                : 'bg-white/15 text-blue-200'
            }`}
          >
            תור חכם
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[11px] font-medium mt-1 ${
              darkText ? 'text-slate-500' : 'text-slate-300'
            }`}
          >
            ניהול וקביעת תורים חכמה
          </span>
        )}
      </div>
    </div>
  );
};
