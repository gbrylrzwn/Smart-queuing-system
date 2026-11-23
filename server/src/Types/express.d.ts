// src/Types/express.d.ts
import * as express from 'express';

// אנו מצהירים על הרחבה של מרחב השמות (Namespace) של Express
declare global {
  namespace Express {
    // אנו מבצעים מיזוג טיפוסים (Type Merging) ומוסיפים את הישות user לתוך ממשק ה-Request המקורי
    interface Request {
      user?: {
        id: number;     // מזהה המשתמש הייחודי מבסיס הנתונים
        role: string;   // תפקיד המשתמש (CLIENT / BUSINESS_OWNER)
      };
    }
  }
}
