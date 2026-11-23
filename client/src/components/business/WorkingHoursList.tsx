// src/components/business/WorkingHoursList.tsx
import React from 'react';
import { WorkingHours } from '../../types';

interface WorkingHoursListProps {
  workingHours: WorkingHours[];
}

/**
 * רכיב המציג בצורה מסודרת ומובנית את שעות הפעילות והאילוצים של העסק
 */
const WorkingHoursList: React.FC<WorkingHoursListProps> = ({ workingHours }) => {
  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // מיון שעות הפעילות לפי ימי השבוע (0 עד 6)
  const sortedHours = [...workingHours].sort((a, b) => a.day - b.day);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-right" dir="rtl">
      <h3 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">📅 שעות פעילות ואילוצים:</h3>
      <ul className="space-y-2 text-xs text-gray-600">
        {sortedHours.map((wh) => (
          <li key={wh.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-none">
            <span className="font-medium text-gray-800">{daysOfWeek[wh.day]}</span>
            {wh.isOpen ? (
              <span className="text-gray-600">
                {wh.openTime} - {wh.closeTime} 
                <span className="text-gray-400 mr-1">(הפסקה: {wh.breakStart}-{wh.breakEnd})</span>
              </span>
            ) : (
              <span className="text-red-500 font-semibold">סגור</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkingHoursList;
