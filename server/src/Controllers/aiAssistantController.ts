import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../Config/db';

const CATEGORY_LABELS: Record<string, string> = {
  HAIR_SALON: 'מספרה ועיצוב שיער',
  CLINIC: 'קליניקה ומרפאה',
  BEAUTY_SALON: 'מכון יופי וקוסמטיקה',
  SPA: 'ספא וטיפולים',
  FITNESS_STUDIO: 'סטודיו ואימונים',
};

const extractOptionalUser = (req: Request): { userId: number; role: string } | null => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ').at(1);
    if (!token) return null;
    const secret = process.env.JWT_SECRET || 'smartqueue_secret_key';
    const decoded: any = jwt.verify(token, secret);
    const userId = Number(decoded?.id || decoded?.userId);
    const role = String(decoded?.role || 'CLIENT');
    if (!userId || isNaN(userId)) return null;
    return { userId, role };
  } catch {
    return null;
  }
};

export const askAiAssistant = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawQuestion = String(req.body?.question || '').trim();
    if (!rawQuestion) {
      res.status(400).json({ error: 'יש להזין שאלה.' });
      return;
    }
    if (rawQuestion.length > 400) {
      res.status(400).json({ error: 'השאלה ארוכה מדי (עד 400 תווים).' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'שירות ה-AI טרם הופעל בשרת (חסר GEMINI_API_KEY בהגדרות השרת).',
      });
      return;
    }

    const authUser = extractOptionalUser(req);
    const role = authUser?.role || 'CLIENT';
    const userId = authUser?.userId || null;
    const currentPath = String(req.body?.currentPath || '/');
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

    let systemInstruction = '';
    const nowStr = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    if (role === 'BUSINESS_OWNER' && userId) {
      const myBusiness = await prisma.business.findFirst({
        where: { ownerId: userId },
        include: {
          services: { select: { name: true, price: true, durationMinutes: true } },
          workingHours: true,
        },
      });

      let ownerAnalyticsContext = 'טרם הוקם פרופיל עסק לחשבון זה.';
      if (myBusiness) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [upcomingApps, monthPaidApps] = await Promise.all([
          prisma.appointment.findMany({
            where: {
              businessId: myBusiness.id,
              status: { in: ['CONFIRMED', 'PENDING'] },
              date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
            include: { service: { select: { name: true, price: true } } },
            orderBy: { date: 'asc' },
            take: 25,
          }),
          prisma.appointment.findMany({
            where: {
              businessId: myBusiness.id,
              status: 'PAID',
              date: { gte: startOfMonth },
            },
            include: { service: { select: { price: true } } },
          }),
        ]);

        const monthlyRevenue = monthPaidApps.reduce(
          (sum, a) => sum + Number(a.service?.price || 0),
          0
        );

        ownerAnalyticsContext = JSON.stringify({
          businessName: myBusiness.name,
          category: CATEGORY_LABELS[myBusiness.category] || myBusiness.category,
          address: myBusiness.address,
          services: myBusiness.services,
          workingHours: myBusiness.workingHours,
          upcomingAppointmentsCount: upcomingApps.length,
          upcomingScheduleSample: upcomingApps.slice(0, 10).map((a) => ({
            date: a.date instanceof Date ? a.date.toISOString().split('T').at(0) : a.date,
            time: `${a.startTime}-${a.endTime}`,
            service: a.service?.name,
            status: a.status,
          })),
          paidAppointmentsThisMonth: monthPaidApps.length,
          monthlyRevenueILS: monthlyRevenue,
        });
      }

      systemInstruction = `
      אתה "היועץ העסקי החכם" של SmartQueue, המיועד אך ורק לבעלי עסקים.
      ענה בעברית טבעית ותמציתית ללא סימני כוכביות (**) או Markdown.
      התאריך והשעה בישראל: ${nowStr}. העמוד הנוכחי: ${currentPath}.
      חוקי הפרדת תפקידים ואבטחה:
      1. סייע אך ורק לבעל העסק בניהול העסק שלו: ניסוח הודעות שיווק והטבות בוואטסאפ ללקוחות, רעיונות למילוי שעות פנויות ביומן וניתוח הכנסות ותורים של העסק שלו.
      2. לעולם אל תפעל כנציג שירות לקוחות ואל תציג נתונים של עסקים אחרים. אם שואלים שאלה של לקוח קצה, הבהר שהממשק מוגדר כיועץ עסקי לניהול העסק שלך בלבד.
      3. אל תמציא נתונים כספיים שאינם מופיעים בנתונים המצורפים.
      נתוני העסק הפרטיים של בעל העסק המחובר בלבד: ${ownerAnalyticsContext}
      `.trim();
    } else if (role === 'SUPER_ADMIN' && userId) {
      const [totalBusinesses, activeSubs, trialSubs, totalAppointments] = await Promise.all([
        prisma.business.count(),
        prisma.business.count({ where: { subscriptionStatus: 'ACTIVE' } }),
        prisma.business.count({ where: { subscriptionStatus: 'TRIAL' } }),
        prisma.appointment.count(),
      ]);

      systemInstruction = `
      אתה עוזר הניהול של מנהל המערכת הראשי (Super Admin) ב-SmartQueue.
      ענה בעברית ברורה ללא סימני כוכביות (**) או Markdown. התאריך בישראל: ${nowStr}.
      נתוני פלטפורמה: סה"כ עסקים: ${totalBusinesses}, מנויים פעילים: ${activeSubs}, בתקופת ניסיון: ${trialSubs}, סה"כ תורים: ${totalAppointments}.
      `.trim();
    } else {
      const businesses: any[] = await prisma.business.findMany({
        where: { subscriptionStatus: { not: 'SUSPENDED' } },
        include: {
          services: { select: { name: true, price: true, durationMinutes: true } },
          workingHours: true,
        },
        take: 30,
      });

      let userAppointmentsContext = 'המשתמש אינו מחובר כרגע לחשבון.';
      if (userId) {
        const now = new Date();
        const myApps: any[] = await prisma.appointment.findMany({
          where: {
            clientId: userId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            date: { gte: new Date(now.setHours(0, 0, 0, 0)) },
          },
          include: {
            business: { select: { name: true, address: true } },
            service: { select: { name: true, price: true } },
          },
          orderBy: { date: 'asc' },
          take: 10,
        });

        userAppointmentsContext =
          myApps.length > 0
            ? JSON.stringify(
                myApps.map((a: any) => ({
                  business: a.business?.name,
                  address: a.business?.address,
                  service: a.service?.name,
                  price: a.service?.price,
                  date: a.date instanceof Date ? a.date.toISOString().split('T').at(0) : a.date,
                  time: `${a.startTime}-${a.endTime}`,
                  staff: a.staffName || 'ללא העדפה',
                  status: a.status,
                }))
              )
            : 'למשתמש המחובר אין תורים עתידיים פעילים כרגע.';
      }

      const businessesSummary = businesses.map((b: any) => ({
        name: b.name,
        category: CATEGORY_LABELS[b.category] || b.category,
        address: b.address,
        services: b.services || [],
        workingHours: b.workingHours || [],
      }));

      systemInstruction = `
      אתה העוזר החכם ללקוחות של מערכת קביעת התורים "SmartQueue | תור חכם".
      ענה בעברית טבעית ותמציתית ללא סימני כוכביות (**) או Markdown. התאריך בישראל: ${nowStr}. העמוד הנוכחי: ${currentPath}.
      חוקי הפרדת תפקידים ואבטחה:
      1. ענה אך ורק על נושאי לקוח קצה: חיפוש עסקים, מחירים, שעות פתיחה, קביעה/ביטול תורים, רשימת המתנה או תפעול האפליקציה ללקוח.
      2. איסור מוחלט על מענה עסקי: לעולם אל תספק ללקוח ייעוץ עסקי או שיווקי לניהול עסק, אל תנסח קמפיינים שיווקיים ואל תשיב על רווחיות או ניהול יומן של בעלי עסקים. אם לקוח מבקש עזרה עסקית, הסבר בנימוס שהעוזר מיועד לקביעת תורים ומידע ללקוחות בלבד.
      3. לעולם אל תחשוף מידע על משתמשים אחרים, טלפונים פרטיים או סיסמאות.
      נתוני העסקים הפעילים: ${JSON.stringify(businessesSummary)}
      נתוני התורים האישיים של הלקוח הנוכחי בלבד: ${userAppointmentsContext}
      `.trim();
    }
    const conversationContents = rawHistory.map((m: any) => ({
      role: m.sender === 'USER' ? 'user' : 'model',
      parts: [{ text: String(m.text || '') }],
    }));

    const lastMsg = conversationContents.at(-1);
    if (!lastMsg || lastMsg.parts.at(0)?.text !== rawQuestion) {
      conversationContents.push({
        role: 'user',
        parts: [{ text: rawQuestion }],
      });
    }

    const domain = ['generativelanguage', 'googleapis', 'com'].join('.');
    const baseHost = `https://${domain}/v1beta`;
    const fastModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    let data: any = {};
    let succeeded = false;
    let lastError = 'לא התקבלה תשובה מהמודל';

    for (const modelName of fastModels) {
      const url = `${baseHost}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const geminiResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: conversationContents,
          generationConfig: {
            temperature: 0.55,
            maxOutputTokens: 550,
          },
        }),
      });

      data = await geminiResp.json().catch(() => ({}));
      if (geminiResp.ok) {
        succeeded = true;
        break;
      }
      lastError = data?.error?.message || `HTTP ${geminiResp.status}`;
    }

    if (!succeeded) {
      res.status(502).json({ error: `שגיאת Gemini: ${lastError}` });
      return;
    }

    const answer =
      data?.candidates?.at(0)?.content?.parts?.at(0)?.text?.replace(/\*\*/g, '').trim() ||
      'לא הצלחתי לנסח תשובה כרגע, אנא נסה לשאול שוב.';

    res.json({ answer });
  } catch (err: any) {
    console.error('askAiAssistant error:', err);
    res.status(500).json({ error: `שגיאה פנימית: ${err?.message || 'שגיאה בעיבוד השאלה'}` });
  }
};
