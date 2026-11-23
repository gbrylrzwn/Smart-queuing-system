// server/src/Config/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// טעינת משתני הסביבה מתוך קובץ ה-env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// א. יצירת בריכת חיבורים (Connection Pool) באמצעות הדרייבר הטבעי של PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ב. אתחול הדרייבר אדפטר הרשמי של פריזמה לגרסאות החדשות
const adapter = new PrismaPg(pool);

// ג. יצירת מופע הלקוח המרכזי המוזרק לתוך האדפטר המאובטח
const prisma = new PrismaClient({ adapter });

/**
 * פונקציית בדיקת החיבור הפיזי למסד הנתונים PostgreSQL
 */
export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('[Database]: Connected to PostgreSQL successfully via Driver Adapter.');
  } catch (error: any) {
    console.error(`[Database error]: Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default prisma;
