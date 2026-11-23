// src/app.ts
import { NotificationService } from './Services/notificationService';

import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import googleCalendarRoutes from './Routes/googleCalendarRoutes';
import smartBiRoutes from './Routes/smartBiRoutes';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDB } from './Config/db';
import authRoutes from './Routes/authRoutes';
import appointmentRoutes from './Routes/appointmentRoutes';
import businessRoutes from './Routes/businessRoutes';
import { errorHandler } from './Middlewares/errorHandler';
import adminRoutes from './Routes/adminRoutes';
import bcrypt from 'bcrypt';
import prisma from './Config/db';
import crmRoutes from './Routes/crmRoutes';
import passkeyRoutes from './Routes/passkeyRoutes';

dotenv.config();

const app: Application = express();

// חובה בסביבת ענן (Render) כדי שמגביל הבקשות יזהה נכון את כתובות המשתמשים
app.set('trust proxy', 1);

app.use(helmet());

const cleanClientUrl = process.env.CLIENT_URL?.replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:3000',
  'https://vercel.app',
  cleanClientUrl,
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'יותר מדי בקשות נשלחו מכתובת זו. אנא נסה שוב בעוד מספר דקות.' },
});

app.use('/api', apiLimiter);

connectDB();

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
        maintenanceMode: true,
      });
      return;
    }
  } catch {}
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/smart-bi', smartBiRoutes);
app.use('/api/passkey', passkeyRoutes);

app.use(errorHandler);

app.get('/api/status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'The Smart Queuing Server is running perfectly.',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server]: API is operating securely on port ${PORT}`);
  NotificationService.startReminderScheduler();

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
            role: 'SUPER_ADMIN',
          },
        });
        console.log(`👑 חשבון מנהל ראשי (SUPER_ADMIN) מסונכרן ומוכן: ${adminEmail}`);
      }
    } catch (err) {
      console.error('שגיאה באתחול מנהל ראשי:', err);
    }
  })();
});

export default app;
