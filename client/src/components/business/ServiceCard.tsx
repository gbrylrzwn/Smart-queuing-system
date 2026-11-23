// src/components/business/ServiceCard.tsx
import React from 'react';
import { Service } from '../../types';

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onSelect: (service: Service) => void;
}

/**
 * כרטיס שירות אינטראקטיבי לבחירת סוג הטיפול מתוך פרופיל העסק
 */
const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(service)}
      className={`p-3 rounded-md border cursor-pointer transition-all text-right ${
        isSelected
          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      dir="rtl"
    >
      <div className="font-bold text-gray-900">{service.name}</div>
      <div className="text-sm text-gray-500 flex justify-between mt-1">
        <span>⏱️ {service.durationMinutes} דקות</span>
        <span className="font-semibold text-blue-600">{service.price} ₪</span>
      </div>
    </div>
  );
};

export default ServiceCard;
