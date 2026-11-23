// src/components/booking/TimeSlotPicker.tsx
import React from 'react';

interface TimeSlotPickerProps {
  slots: string[];
  loading: boolean;
  onSlotSelect: (time: string) => void;
}

/**
 * רכיב אינטראקטיבי המציג את משבצות הזמן הפנויות שחושבו באלגוריתם בשרת
 */
const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ slots, loading, onSlotSelect }) => {
  
  if (loading) {
    return (
      <div className="text-center py-6 text-sm font-medium text-gray-500 animate-pulse">
        🔎 מחשב משבצות זמן פנויות בהתאם לאילוצי העסק...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-6 px-4 border border-dashed border-red-200 rounded-md bg-red-50 text-red-600 text-sm font-medium">
        🚫 אין שעות פנויות זמינות ביום זה, או שהעסק סגור באילוצי המערכת.
      </div>
    );
  }

  return (
    <div className="w-full text-right" dir="rtl">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        ⏰ שעות פנויות זמינות לבחירה:
      </label>
      
      {/* רשת כפתורי שעות רספונסיבית */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {slots.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onSlotSelect(time)}
            className="px-3 py-2 text-sm font-bold border border-blue-200 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-600 hover:text-white hover:border-transparent transition-all duration-150 text-center shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
