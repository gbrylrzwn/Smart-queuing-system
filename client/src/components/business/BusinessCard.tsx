// src/components/business/BusinessCard.tsx
import React from 'react';
import { Business } from '../../types';

interface BusinessCardProps {
  business: Business;
  onViewProfile: (id: number) => void;
  translatedCategory: string;
}

/**
 * כרטיס תצוגה מודולרי לעסק בודד ברשת ה-Grid של דף הבית
 */
const BusinessCard: React.FC<BusinessCardProps> = ({ business, onViewProfile, translatedCategory }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 text-right" dir="rtl">
      <div className="p-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
          {translatedCategory}
        </span>
        <h3 className="text-xl font-bold text-gray-900 mb-1">{business.name}</h3>
        <p className="text-gray-500 text-sm mb-4">{business.address}</p>
        
        <button
          onClick={() => onViewProfile(business.id)}
          className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
        >
          צפייה בשירותים וקביעת תור
        </button>
      </div>
    </div>
  );
};

export default BusinessCard;
