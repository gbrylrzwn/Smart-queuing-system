// src/types/index.ts

/**
 * 1. הגדרת התפקידים במערכת בהתאמה מלאה ל-Enum בשרת
 */
export type UserRole = 'CLIENT' | 'BUSINESS_OWNER' | 'SUPER_ADMIN';

/**
 * 2. הגדרת מצבי הסטטוס של תור בהתאמה מלאה ל-Enum בשרת
 */
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED';

/**
 * 3. הגדרת קטגוריות העסקים המותרות בהתאמה מלאה ל-Enum בשרת
 */
export type BusinessCategory = 'HAIR_SALON' | 'CLINIC' | 'BEAUTY_SALON' | 'SPA' | 'FITNESS_STUDIO';

/**
 * 4. ממשק המייצג משתמש במערכת (User)
 */
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * 5. ממשק המייצג שירות בתוך עסק (Service)
 */
export interface Service {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
  businessId: number;
}

/**
 * 6. ממשק המייצג אילוץ שעות פעילות יומי של עסק (WorkingHours)
 */
export interface WorkingHours {
  id: number;
  businessId: number;
  day: number; // 0 = ראשון, 1 = שני ... 6 = שבת
  isOpen: boolean;
  openTime: string;  // פורמט HH:MM
  closeTime: string; // פורמט HH:MM
  breakStart: string; // אילוץ: תחילת הפסקת צהריים
  breakEnd: string;   // אילוץ: סיום הפסקת צהריים
}

/**
 * 7. ממשק המייצג פרופיל עסק מלא (Business)
 */
export interface Business {
  id: number;
  name: string;
  category: BusinessCategory;
  address: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  // שדות אופציונליים שיגיעו כאשר נבצע שאילתת Include בשרת
  services?: Service[];
  workingHours?: WorkingHours[];
}

/**
 * 8. ממשק המייצג תור ביומן (Appointment)
 */
export interface Appointment {
  id: number;
  clientId: number;
  businessId: number;
  serviceId: number;
  date: string;       // נשמר כסטרינג של תאריך (ISO String)
  startTime: string;  // פורמט HH:MM
  endTime: string;    // פורמט HH:MM
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  // ישויות משולבות לצורך הצגה עשירה במסכי הלקוח והמנהל
  client?: User;
  business?: Business;
  service?: Service;
}
export interface Business {
    id: number;
    name: string;
    category: BusinessCategory;
    address: string;
    imageUrl?: string; // 🔥 הוסף את השורה הזו כאן!
    staff?: any[];
    ownerId: number;
    // שאר השדות הקיימים אצלך...
  }
  