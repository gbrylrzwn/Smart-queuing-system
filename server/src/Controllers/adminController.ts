import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

const SMS_UNIT_COST = 0.12; // עלות ממוצעת של הודעת תזכורת יוצאת בש"ח (ניתן להתאים לפי הספק)

export class AdminController {
  /**
   * בדיקת הרשאת מנהל מערכת ראשי (SUPER_ADMIN)
   */
  private static verifySuperAdmin(req: Request, res: Response): boolean {
    const role = (req as any).user?.role;
    if (role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'גישה נדחתה. מסך זה מיועד למנהל המערכת הראשי בלבד.' });
      return false;
    }
    return true;
  }

  /**
   * שליפת תמונת מצב מלאה של כל העסקים, המשתמשים והתורים במערכת
   * GET /api/admin/overview
   */
  public static async getSystemOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const [businesses, totalClients, totalAppointments] = await Promise.all([
        prisma.business.findMany({
          include: {
            owner: { select: { id: true, name: true, email: true, phone: true } },
            _count: { select: { appointments: true, staff: true, services: true } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where: { role: 'CLIENT' } }),
        prisma.appointment.count()
      ]);

      res.status(200).json({
        stats: {
          totalBusinesses: businesses.length,
          activeBusinesses: businesses.filter(b => b.subscriptionStatus === 'ACTIVE').length,
          trialBusinesses: businesses.filter(b => b.subscriptionStatus === 'TRIAL').length,
          suspendedBusinesses: businesses.filter(b => b.subscriptionStatus === 'SUSPENDED').length,
          totalClients,
          totalAppointments
        },
        businesses
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * עדכון סטטוס מנוי, מכסת SMS, או תעריף מנוי חודשי אישי לעסק
   * PUT /api/admin/businesses/:id/subscription
   */
  public static async updateBusinessSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const businessId = Number(req.params.id);
      const { subscriptionStatus, smsQuota, resetSmsCounter, monthlyFee } = req.body;

      const dataToUpdate: any = {};
      if (subscriptionStatus) dataToUpdate.subscriptionStatus = subscriptionStatus;
      if (typeof smsQuota === 'number' && smsQuota >= 0) dataToUpdate.smsQuota = smsQuota;
      if (resetSmsCounter === true) dataToUpdate.smsUsedThisMonth = 0;
      if (typeof monthlyFee === 'number' && monthlyFee >= 0) dataToUpdate.monthlyFee = monthlyFee;

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: dataToUpdate
      });

      res.status(200).json({ message: 'הגדרות המנוי והתעריף עודכנו בהצלחה.', business: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * דוח הכנסות ורווחיות מלא למנהל הראשי (MRR, עלויות SMS, רווח נקי לפי עסק ולפי חודש)
   * GET /api/admin/financial-report
   */
  public static async getFinancialReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const businesses = await prisma.business.findMany({
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      // 1. חישוב רווחיות לפי עסק (חודש נוכחי)
      const businessBreakdown = businesses.map((b) => {
        const isActive = b.subscriptionStatus === 'ACTIVE';
        const revenue = isActive ? (b.monthlyFee ?? 99) : 0;
        const smsCost = Number(((b.smsUsedThisMonth || 0) * SMS_UNIT_COST).toFixed(2));
        const netProfit = Number((revenue - smsCost).toFixed(2));

        return {
          id: b.id,
          name: b.name,
          ownerName: b.owner?.name || 'לא צוין',
          subscriptionStatus: b.subscriptionStatus,
          monthlyFee: b.monthlyFee ?? 99,
          smsUsedThisMonth: b.smsUsedThisMonth || 0,
          revenue,
          smsCost,
          netProfit,
          createdAt: b.createdAt
        };
      });

      const totalMonthlyRevenue = Number(
        businessBreakdown.reduce((sum, b) => sum + b.revenue, 0).toFixed(2)
      );
      const totalMonthlySmsCost = Number(
        businessBreakdown.reduce((sum, b) => sum + b.smsCost, 0).toFixed(2)
      );
      const totalMonthlyNetProfit = Number(
        (totalMonthlyRevenue - totalMonthlySmsCost).toFixed(2)
      );

      // 2. פילוח לפי 6 החודשים האחרונים (לפי תאריך הצטרפות העסקים הפעילים וקיזוז עלויות הודעות)
      const now = new Date();
      const monthlyHistory = [];
      const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];

      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const isCurrentMonth = i === 0;

        const activeInThatMonth = businesses.filter(
          (b) => b.subscriptionStatus === 'ACTIVE' && new Date(b.createdAt) <= endOfMonth
        );

        const monthRevenue = Number(
          activeInThatMonth.reduce((sum, b) => sum + (b.monthlyFee ?? 99), 0).toFixed(2)
        );
        const monthSmsCost = isCurrentMonth
          ? totalMonthlySmsCost
          : Number((activeInThatMonth.length * 18 * SMS_UNIT_COST).toFixed(2));
        const monthNetProfit = Number((monthRevenue - monthSmsCost).toFixed(2));

        monthlyHistory.push({
          monthKey: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
          monthLabel: `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`,
          activeCount: activeInThatMonth.length,
          revenue: monthRevenue,
          smsCost: monthSmsCost,
          netProfit: monthNetProfit
        });
      }

      res.status(200).json({
        smsUnitCost: SMS_UNIT_COST,
        summary: {
          totalMonthlyRevenue,
          totalMonthlySmsCost,
          totalMonthlyNetProfit,
          activeSubscribersCount: businessBreakdown.filter((b) => b.subscriptionStatus === 'ACTIVE').length
        },
        businessBreakdown,
        monthlyHistory
      });
    } catch (error) {
      next(error);
    }
  }
    /**
   * שליפת הגדרות פלטפורמה ראשיות (מספר וואטסאפ לתמיכה ושדרוג מנויים)
   * GET /api/admin/settings
   */
    public static async getSystemSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
          let settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
          if (!settings) {
            settings = await prisma.systemSettings.create({
              data: { id: 1, supportPhone: '972500000000' },
            });
          }
          res.status(200).json({ settings });
        } catch (error) {
          next(error);
        }
      }
    
      /**
       * עדכון הגדרות פלטפורמה ראשיות ע"י מנהל מערכת ראשי
       * PUT /api/admin/settings
       */
     public static async updateSystemSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const existing = await prisma.systemSettings.findUnique({ where: { id: 1 } });
      let formattedPhone = existing?.supportPhone || '972500000000';

      if (req.body.supportPhone !== undefined) {
        const rawPhone = String(req.body.supportPhone || '').replace(/\D/g, '');
        formattedPhone = rawPhone.startsWith('0') ? '972' + rawPhone.slice(1) : rawPhone;

        if (!formattedPhone || formattedPhone.length < 9) {
          res.status(400).json({ error: 'יש להזין מספר טלפון תקין.' });
          return;
        }
      }

      const maintenanceMode =
        req.body.maintenanceMode !== undefined
          ? Boolean(req.body.maintenanceMode)
          : (existing?.maintenanceMode ?? false);

      const settings = await prisma.systemSettings.upsert({
        where: { id: 1 },
        update: { supportPhone: formattedPhone, maintenanceMode },
        create: { id: 1, supportPhone: formattedPhone, maintenanceMode },
      });

      res.status(200).json({
        message: 'הגדרות המערכת עודכנו בהצלחה.',
        settings,
      });
    } catch (error) {
      next(error);
    }
  }

      /**
   * שליפת יומן גבייה ותשלומים של הפלטפורמה + סיכום תקבולים
   * GET /api/admin/billing
   */
  public static async getBillingHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const payments = await prisma.platformPayment.findMany({
        include: {
          business: {
            select: {
              id: true,
              name: true,
              subscriptionStatus: true,
              monthlyFee: true,
              owner: { select: { name: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalCollected = Number(
        payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0).toFixed(2)
      );
      const totalPending = Number(
        payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0).toFixed(2)
      );
      const totalFailed = Number(
        payments.filter((p) => p.status === 'FAILED').reduce((sum, p) => sum + p.amount, 0).toFixed(2)
      );

      res.status(200).json({
        summary: { totalCollected, totalPending, totalFailed },
        payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * תיעוד גבייה חדשה (העברה בנקאית, צ'ק, ביט/פייבוקס או דרישת תשלום) והפעלת מנוי אוטומטית
   * POST /api/admin/billing
   */
  public static async createPlatformPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const { businessId, amount, paymentMethod, referenceNumber, status, billingMonth, dueDate, notes } = req.body;

      if (!businessId || !amount || Number(amount) <= 0) {
        res.status(400).json({ error: 'יש לבחור עסק ולהזין סכום חיוב תקין.' });
        return;
      }

      const paymentStatus = status || 'PAID';
      const defaultMonth = new Date().toISOString().slice(0, 7);

      const payment = await prisma.platformPayment.create({
        data: {
          businessId: Number(businessId),
          amount: Number(amount),
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          referenceNumber: referenceNumber ? String(referenceNumber).trim() : null,
          status: paymentStatus,
          billingMonth: billingMonth || defaultMonth,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes ? String(notes).trim() : null,
        },
      });

      // אם התשלום שולם/אושר — הפעל אוטומטית את המנוי של העסק
      if (paymentStatus === 'PAID') {
        await prisma.business.update({
          where: { id: Number(businessId) },
          data: { subscriptionStatus: 'ACTIVE' },
        });
      }

      res.status(201).json({
        message:
          paymentStatus === 'PAID'
            ? 'התשלום נרשם בהצלחה ומנוי העסק הופעל אוטומטית!'
            : 'דרישת התשלום / הצ׳ק הדחוי נרשמו בהמתנה לפירעון.',
        payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * עדכון סטטוס פירעון של חיוב (למשל סימון צ'ק דחוי כנפרע לחשבון הבנק)
   * PUT /api/admin/billing/:id/status
   */
  public static async updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!AdminController.verifySuperAdmin(req, res)) return;

      const paymentId = Number(req.params.id);
      const { status } = req.body;

      if (!['PAID', 'PENDING', 'FAILED'].includes(status)) {
        res.status(400).json({ error: 'סטטוס תשלום לא חוקי.' });
        return;
      }

      const updatedPayment = await prisma.platformPayment.update({
        where: { id: paymentId },
        data: { status },
      });

      if (status === 'PAID') {
        await prisma.business.update({
          where: { id: updatedPayment.businessId },
          data: { subscriptionStatus: 'ACTIVE' },
        });
      }

      res.status(200).json({
        message: status === 'PAID' ? 'התשלום סומן כנפרע ומנוי העסק פעיל!' : 'סטטוס החיוב עודכן.',
        payment: updatedPayment,
      });
    } catch (error) {
      next(error);
    }
  }

}
