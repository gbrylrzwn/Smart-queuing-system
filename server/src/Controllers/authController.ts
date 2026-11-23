import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../Config/db';
import { NotificationService } from '../Services/notificationService';

// זיכרון זמני לקודי אימות חד-פעמיים (טלפון -> קוד ותוקף)
const otpStore = new Map<string, { code: string; name: string; expiresAt: number }>();

const normalizePhone = (raw: string): string => raw.replace(/[^0-9]/g, '');

export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cleanName = String(req.body.name || '').trim();
    const cleanPhone = String(req.body.phone || '').trim();
    const digits = normalizePhone(cleanPhone);

    if (!cleanName || digits.length < 9) {
      res.status(400).json({ error: 'יש להזין שם מלא ומספר טלפון נייד תקין.' });
      return;
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(digits, {
      code,
      name: cleanName,
      expiresAt: Date.now() + 5 * 60 * 1000 // תוקף ל-5 דקות
    });

    console.log(`\n🔐 [קוד אימות SMS עבור ${cleanName} (${cleanPhone})]: ${code}\n`);
    await NotificationService.sendExternalMessage(cleanPhone, `קוד האימות שלך ל-SmartQueue הוא: ${code}`);

    const isSmsConfigured = Boolean(process.env.SMS_WEBHOOK_URL || process.env.CALLMEBOT_APIKEY);
    res.status(200).json({
      message: isSmsConfigured
        ? 'קוד אימות בן 4 ספרות נשלח אליך ב-SMS.'
        : `מצב בדיקה: קוד האימות שלך הוא ${code}`
    });


  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cleanPhone = String(req.body.phone || '').trim();
    const inputCode = String(req.body.code || '').trim();
    const digits = normalizePhone(cleanPhone);

    const record = otpStore.get(digits);
    if (!record || Date.now() > record.expiresAt) {
      res.status(400).json({ error: 'קוד האימות פג תוקף או שלא נשלח. אנא בקש קוד חדש.' });
      return;
    }

    if (record.code !== inputCode) {
      res.status(400).json({ error: 'קוד האימות שהוזן שגוי. אנא נסה שנית.' });
      return;
    }

    otpStore.delete(digits);

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: digits }]
      }
    });
    if (user && user.role !== 'CLIENT') {
      res.status(403).json({
        error: 'מספר טלפון זה משויך לחשבון ניהול. אנא התחבר דרך טאב "טלפון וסיסמה".'
      });
      return;
    }


    if (!user) {
      const randomPass = await bcrypt.hash(`OTP_${digits}_${Date.now()}`, 10);
      user = await prisma.user.create({
        data: {
          name: record.name,
          phone: cleanPhone,
          password: randomPass,
          role: 'CLIENT'
        }
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is missing from the environment variables.');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const businessProfile = await prisma.business.findFirst({ where: { ownerId: user.id } });

    res.status(200).json({
      message: 'התחברת בהצלחה!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        businessId: businessProfile ? businessProfile.id : null
      }
    });
  } catch (error) {
    next(error);
  }
};
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !password || !phone) {
      res.status(400).json({ error: 'שם מלא, מספר טלפון וסיסמה הם שדות חובה.' });
      return;
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null;

    const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (existingPhone) {
      if (existingPhone.role === 'CLIENT' && !existingPhone.email) {
        if (cleanEmail) {
          const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
          if (existingEmail && existingEmail.id !== existingPhone.id) {
            res.status(400).json({ error: 'כתובת אימייל זו כבר רשומה במערכת.' });
            return;
          }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const upgradedUser = await prisma.user.update({
          where: { id: existingPhone.id },
          data: {
            name: String(name).trim(),
            email: cleanEmail,
            password: hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true
          }
        });

        res.status(200).json({ message: 'החשבון שודרג לחשבון קבוע בהצלחה!', user: upgradedUser });
        return;
      }

      res.status(400).json({ error: 'מספר טלפון זה כבר רשום במערכת.' });
      return;
    }


    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingEmail) {
        res.status(400).json({ error: 'כתובת אימייל זו כבר רשומה במערכת.' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: cleanPhone,
        role: role || 'CLIENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ message: 'ההרשמה הושלמה בהצלחה!', user: newUser });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const identifier = String(req.body.phone || req.body.email || '').trim();
    const { password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'יש להזין מספר טלפון (או אימייל) וסיסמה.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier.toLowerCase() }
        ]
      }
    });

    if (!user) {
      res.status(404).json({
        error: 'לא נמצא חשבון עם פרטים אלו. נראה שעדיין לא נרשמת למערכת.',
        notRegistered: true
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'הסיסמה שהוזנה שגויה. אנא נסה שנית.' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is missing from the environment variables.');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const businessProfile = await prisma.business.findFirst({ where: { ownerId: user.id } });

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        businessId: businessProfile ? businessProfile.id : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsedId = (req as any).user?.userId || (req as any).user?.id;
    const userId = Number(parsedId);

    if (!userId || isNaN(userId)) {
      res.status(401).json({ error: 'משתמש לא מורשה במערכת.' });
      return;
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(404).json({ error: 'משתמש זה אינו קיים עוד במערכת.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const business = await tx.business.findFirst({ where: { ownerId: userId } });
      if (business) {
        await tx.workingHours.deleteMany({ where: { businessId: business.id } });
        await tx.service.deleteMany({ where: { businessId: business.id } });
        await tx.appointment.deleteMany({ where: { businessId: business.id } });
        await tx.business.delete({ where: { id: business.id } });
      }
      await tx.user.delete({ where: { id: userId } });
    });

    res.status(200).json({ message: 'החשבון והמידע נמחקו לצמיתות בהצלחה' });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = Number((req as any).user?.userId || (req as any).user?.id);
    const { name, phone, email } = req.body;

    if (!userId || isNaN(userId)) {
      res.status(401).json({ error: 'משתמש לא מורשה במערכת.' });
      return;
    }

    if (!name || !phone) {
      res.status(400).json({ error: 'שם ומספר טלפון הם שדות חובה.' });
      return;
    }

    const dataToUpdate: any = { name: String(name).trim(), phone: String(phone).trim() };
    if (email !== undefined) {
      dataToUpdate.email = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is missing from the environment variables.');
    }

    const token = jwt.sign(
      { userId: updatedUser.id, role: updatedUser.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'הפרופיל עודכן בהצלחה',
      user: updatedUser,
      token
    });
  } catch (error) {
    next(error);
  }
};
