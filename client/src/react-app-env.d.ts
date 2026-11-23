/// <reference types="react-scripts" />

declare namespace NodeJS {
    interface ProcessEnv {
      // הגדרת משתני הסביבה באופן קשיח (Type-Safe) עבור ה-Frontend
      NODE_ENV: 'development' | 'production' | 'test';
      REACT_APP_API_URL: string; // כתובת ה-API של שרת ה-Node.js
    }
  }
  
