// src/Middlewares/roleMiddleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware להגבלת נתיבים על בסיס הרשאות תפקיד במערכת
 * @param allowedRoles - מערך של תפקידים המורשים לגשת לנתיב (למשל: ['BUSINESS_OWNER'])
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. שליפת פרטי המשתמש שהוצמדו לבקשה בשלב ה-authMiddleware הקודם
    const user = (req as any).user;

    // 2. הגנה מפני מצב שבו שכחו להפעיל את ה-authMiddleware לפני ה-roleMiddleware
    if (!user || !user.role) {
       res.status(500).json({ error: 'Internal server error. Authentication context missing.' });
       return;
    }

    // 3. בדיקה האם התפקיד של המשתמש הנוכחי קיים ברשימת התפקידים המורשים לנתיב זה
    const hasPermission = allowedRoles.includes(user.role);

    if (!hasPermission) {
       // אם המשתמש הוא CLIENT והנתיב דורש BUSINESS_OWNER, נחזיר קוד 403 (Forbidden)
       res.status(403).json({ error: 'Access denied. You do not have permission to access this resource.' });
       return;
    }

    // 4. המשתמש מחזיק בהרשאה המתאימה! מעבירים את הטיפול לפונקציה הבאה בתור (ל-Controller)
    next();
  };
};
