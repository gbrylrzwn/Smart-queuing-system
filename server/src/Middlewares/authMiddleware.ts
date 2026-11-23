// server/src/Middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: number;
  role: string;
}

/**
 * Middleware לאימות תוקף טוקן ה-JWT וחסימת משתמשים לא מחוברים
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       res.status(401).json({ error: 'Access denied. No token provided.' });
       return;
    }

    // התיקון המוחלט: חיתוך המחרוזת ושליפת אסימון הסטרינג המדויק מאינדקס 1
    const token = authHeader.split(' ')[1];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error.' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    // הנגשת המזהה תחת שני המפתחות (id ו-userId) במקביל לסנכרון מלא
    (req as any).user = {
      id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error) {
     res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
