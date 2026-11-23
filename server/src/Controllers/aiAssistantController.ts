import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

const DAY_NAMES_HE: Record<number, string> = {
  0: 'ראשון',
  1: 'שני',
  2: 'שלישי',
  3: 'רביעי',
  4: 'חמישי',
  5: 'שישי',
  6: 'שבת',
};

const CATEGORY_NAMES_HE: Record<string, string> = {
  HAIR_SALON: 'מספרות ועיצוב שיער',
  CLINIC: 'קליניקות ומרפאות',
  BEAUTY_SALON: 'מכוני יופי וקוסמטיקה',
  SPA: 'ספא וטיפולים',
  FITNESS_STUDIO: 'סטודיו ואימונים',
};

const BLOCKED_SECURITY_PATTERNS = [
  /קוד/i, /שרת/i, /מסד נתונים/i, /דאטה ?בייס/i, /סיסמ/i, /מפתח/i, /טוקן/i,
  /פריצ/i, /האק/i, /אדמין/i, /מנהל מערכת/i, /הכנסות/i, /רווח/i, /ארכיטקטור/i,
  /איך.*עובד.*מאחורי/i, /איך.*בנוי/i, /מבנה המערכת/i, /sql/i, /prisma/i, /api/i,
  /jwt/i, /env/i, /token/i, /password/i, /database/i, /hack/i, /prompt/i, /system/i,
];

const matchCustomerGuideQuestion = (q: string): string | null => {
  if (/איך.*(קובע|לקבוע|מזמין|להזמין).*תור/.test(q) || /קביעת תור/.test(q)) {
    return (
      'קביעת תור ב-SmartQueue היא פשוטה ומהירה:\n' +
      '1. בדף הבית חפשו עסק לפי שם, תחום, חיפוש קולי או סינון לפי מיקום.\n' +
      '2. לחצו על כרטיס העסק כדי לצפות בשירותים, במחירים ובצוות.\n' +
      '3. בחרו שירות, איש צוות, תאריך ושעה פנויה, ואשרו את ההזמנה.'
    );
  }

  if (/איך.*(מבטל|לבטל|לשנות|לדחות).*תור/.test(q) || /ביטול תור/.test(q) || /התורים שלי/.test(q)) {
    return (
      'כדי לצפות בתורים שלך או לבטל תור קיים:\n' +
      'לחצו על כפתור התפריט הראשי (☰) בצד שמאל למעלה -> בחרו ב-"התורים שלי". שם תוכלו לראות את כל התורים העתידיים ולנהל אותם בקליק.'
    );
  }

  if (/חיפוש קולי/.test(q) || /מיקרופון/.test(q) || /קרוב אלי/.test(q) || /מיקום/.test(q)) {
    return (
      'בדף הבית עומדים לרשותכם שני כלים חכמים למציאת עסק במהירות:\n' +
      '• כפתור המיקרופון בתוך שורת החיפוש — מאפשר לומר בקול את שם העסק או השירות בעברית.\n' +
      '• כפתור "סנן לפי המיקום שלי" — מציג עסקים קרובים אליכם במרחק של עד 20 ק"מ וממיין מהקרוב לרחוק.'
    );
  }

  if (/מועדפ/.test(q) || /לשמור עסק/.test(q)) {
    return (
      'כדי לשמור עסק במועדפים לגישה מהירה:\n' +
      'לחצו על סמל הלב בכרטיס העסק בדף הבית. את כל העסקים השמורים תוכלו למצוא דרך התפריט הראשי -> "העסקים המועדפים שלי".'
    );
  }

  if (/איך.*מתחבר/.test(q) || /הרשמה/.test(q) || /טביעת אצבע/.test(q) || /זיהוי פנים/.test(q)) {
    return (
      'ניתן להירשם ולהתחבר באמצעות מספר טלפון וסיסמה, או להשתמש בכניסה מהירה עם קוד SMS חד-פעמי. לאחר ההתחברות הראשונה ניתן להפעיל בתפריט הראשי התחברות מהירה בטביעת אצבע או זיהוי פנים.'
    );
  }

  if (/מה זה/.test(q) || /היכרות/.test(q) || /מה האפליקציה/.test(q) || /איך משתמשים/.test(q)) {
    return (
      'ברוכים הבאים ל-SmartQueue (תור חכם) — המערכת המתקדמת למציאת עסקים וקביעת תורים אונליין.\n' +
      'כאן תוכלו לחפש מספרות, קליניקות, מכוני יופי, ספא וסטודיו כושר, לבדוק זמינות בזמן אמת, לקבל תזכורות ולנהל את כל התורים שלכם במקום אחד.'
    );
  }

  return null;
};
export class AiAssistantController {
    public static async askAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const rawQuestion = String(req.body.question || '').trim();
  
        if (!rawQuestion || rawQuestion.length > 300) {
          res.status(400).json({
            error: 'אנא הזן שאלה קצרה וברורה (עד 300 תווים).',
          });
          return;
        }
  
        if (BLOCKED_SECURITY_PATTERNS.some((pattern) => pattern.test(rawQuestion))) {
          res.status(200).json({
            answer:
              'אני העוזר החכם ללקוחות SmartQueue. אני יכול לעזור במידע על העסקים הפעילים באפליקציה (שעות פתיחה, שירותים, מחירים ומיקומים) ובהסבר על אופן השימוש וקביעת תורים באתר. אינני מספק מידע טכני או פנימי על המערכת.',
          });
          return;
        }
  
        const guideAnswer = matchCustomerGuideQuestion(rawQuestion);
        if (guideAnswer) {
          res.status(200).json({ answer: guideAnswer });
          return;
        }
  
        const now = new Date();
        const publicBusinesses = await prisma.business.findMany({
          where: {
            subscriptionStatus: { not: 'SUSPENDED' },
            NOT: {
              AND: [
                { subscriptionStatus: 'TRIAL' },
                { trialEndsAt: { lt: now } },
              ],
            },
          },
          select: {
            name: true,
            address: true,
            category: true,
            services: {
              select: { name: true, price: true, durationMinutes: true },
            },
            workingHours: {
              select: { day: true, openTime: true, closeTime: true, isOpen: true },
              orderBy: { day: 'asc' },
            },
          },
        });
  
        const q = rawQuestion.toLowerCase();
  
        if (/כמה עסקים/.test(q) || /אילו עסקים/.test(q) || /איזה עסקים/.test(q) || /רשימת העסקים/.test(q)) {
          if (publicBusinesses.length === 0) {
            res.status(200).json({ answer: 'כרגע אין עסקים זמינים להצגה במערכת. בקרוב יצטרפו עסקים נוספים!' });
            return;
          }
          const namesList = publicBusinesses
            .slice(0, 10)
            .map((b) => `• ${b.name} (${CATEGORY_NAMES_HE[b.category] || b.category} — ${b.address})`)
            .join('\n');
          res.status(200).json({
            answer: `כרגע פעילים באפליקציה ${publicBusinesses.length} עסקים מאושרים:\n${namesList}`,
          });
          return;
        }
  
        const matchedBusiness = publicBusinesses.find((b) =>
          q.includes(b.name.trim().toLowerCase())
        );
  
        if (matchedBusiness) {
          if (/שעות|פתוח|פתיחה|סגור|סגירה|עובד/.test(q)) {
            if (!matchedBusiness.workingHours || matchedBusiness.workingHours.length === 0) {
              res.status(200).json({
                answer: `לעסק "${matchedBusiness.name}" טרם הוזנו שעות פעילות מפורטות. מומלץ להיכנס לכרטיס העסק כדי לבדוק מועדים פנויים.`,
              });
              return;
            }
            const hoursSummary = matchedBusiness.workingHours
              .map((wh) =>
                !wh.isOpen
                  ? `• יום ${DAY_NAMES_HE[wh.day]}: סגור`
                  : `• יום ${DAY_NAMES_HE[wh.day]}: ${wh.openTime} - ${wh.closeTime}`
              )
              .join('\n');
            res.status(200).json({
              answer: `שעות הפעילות של "${matchedBusiness.name}" (${matchedBusiness.address}):\n${hoursSummary}`,
            });
            return;
          }
  
          if (/מחיר|עולה|כמה|שירות|טיפולים/.test(q)) {
            const srvList = matchedBusiness.services
              .map((s) => `• ${s.name}: ₪${s.price} (${s.durationMinutes} דקות)`)
              .join('\n');
            res.status(200).json({
              answer: srvList
                ? `השירותים והמחירים של "${matchedBusiness.name}":\n${srvList}`
                : `לעסק "${matchedBusiness.name}" טרם פורסם מחירון שירותים.`,
            });
            return;
          }
  
          const catLabel = CATEGORY_NAMES_HE[matchedBusiness.category] || matchedBusiness.category;
          res.status(200).json({
            answer:
              `פרטי העסק "${matchedBusiness.name}":\n` +
              `• תחום: ${catLabel}\n` +
              `• כתובת: ${matchedBusiness.address}\n` +
              `• מספר שירותים מוצעים: ${matchedBusiness.services.length}\n` +
              `ניתן לשאול אותי גם על שעות הפתיחה או המחירים של עסק זה.`,
          });
          return;
        }
  
        const matchedCategoryEntry = Object.entries(CATEGORY_NAMES_HE).find(([, label]) =>
          label.split(' ').some((word) => word.length > 2 && q.includes(word))
        );
  
        if (matchedCategoryEntry) {
          const [catKey, catLabel] = matchedCategoryEntry;
          const catBusinesses = publicBusinesses.filter((b) => b.category === catKey);
          if (catBusinesses.length === 0) {
            res.status(200).json({ answer: `כרגע אין עסקים רשומים בתחום "${catLabel}".` });
            return;
          }
          const list = catBusinesses.map((b) => `• ${b.name} — ${b.address}`).join('\n');
          res.status(200).json({
            answer: `נמצאו ${catBusinesses.length} עסקים בתחום ${catLabel}:\n${list}`,
          });
          return;
        }
  
        res.status(200).json({
          answer:
            'אשמח לעזור! ניתן לשאול אותי שאלות כגון:\n' +
            '• "כמה עסקים פעילים יש באפליקציה?"\n' +
            '• "מה שעות הפתיחה של [שם העסק]?"\n' +
            '• "כמה עולה שירות ב-[שם העסק]?"\n' +
            '• "איך קובעים או מבטלים תור באפליקציה?"',
        });
      } catch (error) {
        next(error);
      }
    }
  }
  