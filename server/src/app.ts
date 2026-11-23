// src/app.ts
import { NotificationService } from './Services/notificationService';

import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import googleCalendarRoutes from './Routes/googleCalendarRoutes';
import smartBiRoutes from './Routes/smartBiRoutes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


// 🔗 הקשר לקובץ : ייבוא פונקציית החיבור לבסיס הנתונים מתוך תיקיית Config
import {connectDB} from './Config/db';
//  הקשר לקובץ ה-Routes: ייבוא נתב האימות והרישום שכתבת
import authRoutes from './Routes/authRoutes';

import appointmentRoutes from './Routes/appointmentRoutes';

import businessRoutes from './Routes/businessRoutes';
import { errorHandler } from './Middlewares/errorHandler';
import adminRoutes from './Routes/adminRoutes';
import bcrypt from 'bcrypt';
import prisma from './Config/db';
import crmRoutes from './Routes/crmRoutes';
import passkeyRoutes from './Routes/passkeyRoutes';

// טעינת משתני הסביבה מקובץ ה-.env לזיכרון השרת
dotenv.config();

// יצירת מופע של אפליקציית Express עם הגדרת הטיפוס המתאים ב-TypeScript
const app: Application = express();
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות נשלחו מכתובת זו. אנא נסה שוב בעוד מספר דקות.' }
});

app.use('/api', apiLimiter);


//  הפעלת החיבור לבסיס הנתונים PostgreSQL (מפעיל את הלוגיקה שכתבנו ב-Config/db.ts)
connectDB();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));


// 🔥 התיקון המוחלט בשרת הראשי להתרת תמונות גדולות ומניעת PayloadTooLargeError
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(async (req: Request, res: Response, next) => {
  if (
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth/login') ||
    req.path === '/api/status'
  ) {
    return next();
  }
  try {
    const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (settings?.maintenanceMode) {
      res.status(503).json({
        error: 'המערכת נמצאת כעת בתחזוקה יזומה. נשוב לפעילות בהקדם!',
        maintenanceMode: true
      });
      return;
    }
  } catch { }
  next();
});

//  החיבור המרכזי: רישום נתיבי האימות בשרת
// כל בקשה שתגיע מהדפדפן ותתחיל בכתובת /api/auth תופנה אוטומטית לקובץ authRoutes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);//חיבור מערכת התורים
app.use('/api/business', businessRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/smart-bi', smartBiRoutes);
app.use('/api/passkey', passkeyRoutes);

app.use(errorHandler);

// נתיב בדיקה בסיסי (Health Check Endpoint)
app.get('/api/status', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'The Smart Queuing Server is running perfectly.' 
  });
});

// הגדרת הפורט מתוך קובץ ה-.env, או שימוש בפורט 5000 כברירת מחדל
const PORT = process.env.PORT || 5000;

// הפעלת השרת והאזנה לבקשות
app.listen(PORT, () => {
  console.log(`[Server]: API is operating securely on port ${PORT}`);
  NotificationService.startReminderScheduler();
  // יצירה אוטומטית של חשבון מנהל המערכת הראשי (Super Admin) מתוך .env
(async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: 'SUPER_ADMIN', password: hashedPassword },
        create: {
          name: 'מנהל מערכת ראשי',
          email: adminEmail,
          password: hashedPassword,
          phone: '0500000000',
          role: 'SUPER_ADMIN'
        }
      });
      console.log(`👑 חשבון מנהל ראשי (SUPER_ADMIN) מסונכרן ומוכן: ${adminEmail}`);
    }
  } catch (err) {
    console.error('שגיאה באתחול מנהל ראשי:', err);
  }
})();

});

export default app;
