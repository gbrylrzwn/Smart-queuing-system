// src/Middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware מרכזי לטיפול ותפיסת שגיאות באפליקציה (Global Error Handler)
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // 1. הדפסת השגיאה ומסלול הקריסה שלה (Stack Trace) ללוג של השרת לצורכי דיבאג של המפתח
  console.error(`[Global Error Handler]: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // 2. קביעת קוד סטטוס: אם השגיאה כבר מכילה קוד סטטוס נשתמש בו, אחרת ברירת המחדל היא 500 (שגיאת שרת פנימית)
  const statusCode = err.statusCode || 500;
  
  // 3. החזרת תשובת JSON אחידה ומסודרת ל-Frontend (React) כדי שהאפליקציה לא תיתקע במסך לבן
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.'
  });
};
