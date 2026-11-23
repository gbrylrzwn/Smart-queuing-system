// src/components/booking/DatePicker.tsx
import React from 'react';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

/**
 * רכיב לוח שנה מבוקר לבחירת תאריך התור, המונע בחירת תאריכי עבר
 */
const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateChange }) => {
  // חישוב התאריך של היום הנוכחי בפורמט YYYY-MM-DD כדי לחסום תאריכי עבר ברמת ה-UI
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full text-right" dir="rtl">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        📅 בחר תאריך להגעת התור:
      </label>
      <input
        type="date"
        value={selectedDate}
        min={todayStr} // אילוץ דפדפן קשיח: חוסם לחיצה על ימים שכבר עברו
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full sm:w-1/2 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white font-medium text-gray-900"
      />
    </div>
  );
};

export default DatePicker;
