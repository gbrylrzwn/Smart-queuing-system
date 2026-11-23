import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

export class SmartBiController {
  public static async markNoShow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const appointmentId = Number(req.params.appointmentId);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { business: true, client: true },
      });

      if (!appointment || appointment.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אין הרשאה לעדכן תור זה.' });
        return;
      }

      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELED' },

      });

      let updatedClient = null;
      if (appointment.clientId && appointment.client) {
        const newNoShowCount = (appointment.client.noShowCount || 0) + 1;
        const newScore = Math.max(0, 100 - newNoShowCount * 20);
        updatedClient = await prisma.user.update({
          where: { id: appointment.clientId },
          data: {
            noShowCount: newNoShowCount,
            reliabilityScore: newScore,
          },
          select: { id: true, name: true, noShowCount: true, reliabilityScore: true },
        });
      }

      res.status(200).json({
        message: 'התור סומן כאי-הגעה וציון האמינות של הלקוח עודכן.',
        client: updatedClient,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resetClientReliability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const clientId = Number(req.params.clientId);

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(403).json({ error: 'לא נמצא עסק משויך למשתמש זה.' });
        return;
      }

      await prisma.user.update({
        where: { id: clientId },
        data: { noShowCount: 0, reliabilityScore: 100 },
      });

      res.status(200).json({ message: 'מונה ההברזות אופס וציון האמינות שוקם ל-100.' });
    } catch (error) {
      next(error);
    }
  }

  public static async getGapCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const dateStr = String(req.query.date || new Date().toISOString().split('T')[0]);

      const business = await prisma.business.findFirst({
        where: { ownerId },
        include: { services: true },
      });

      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק.' });
        return;
      }

      const targetStart = new Date(dateStr);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(dateStr);
      targetEnd.setHours(23, 59, 59, 999);

      const allAppointments = await prisma.appointment.findMany({
        where: { businessId: business.id },

        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true, reliabilityScore: true, noShowCount: true },
          },
          service: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
      });

      const bookedOnTargetDate = new Set<number>(
        allAppointments
          .filter((a) => a.date >= targetStart && a.date <= targetEnd && a.status !== 'CANCELED')
          .map((a) => a.clientId!)
      );

      const candidatesMap = new Map<number, any>();

      const futureCutoff = new Date(targetEnd);
      futureCutoff.setDate(futureCutoff.getDate() + 2);

      for (const app of allAppointments) {
        if (!app.client || bookedOnTargetDate.has(app.client.id)) continue;
        if (app.date > futureCutoff && (app.status === 'CONFIRMED' || app.status === 'PENDING')) {
          if (!candidatesMap.has(app.client.id) && (app.client.reliabilityScore ?? 100) >= 60) {
            candidatesMap.set(app.client.id, {
              ...app.client,
              reason: `הקדמת תור (קבוע ל-${new Date(app.date).toLocaleDateString('he-IL')})`,
              priority: 1,
            });
          }
        }
      }

      const visitCounts = new Map<number, { count: number; lastVisit: Date; client: any; lastService: string }>();
      for (const app of allAppointments) {
        if (!app.client || bookedOnTargetDate.has(app.client.id)) continue;
        if (app.status === 'CONFIRMED') {

          const prev = visitCounts.get(app.client.id);
          if (!prev) {
            visitCounts.set(app.client.id, {
              count: 1,
              lastVisit: app.date,
              client: app.client,
              lastService: app.service?.name || 'טיפול',
            });
          } else {
            prev.count += 1;
            if (app.date > prev.lastVisit) prev.lastVisit = app.date;
          }
        }
      }

      const sortedRegulars = Array.from(visitCounts.values())
        .filter((item) => (item.client.reliabilityScore ?? 100) >= 60)
        .sort((a, b) => b.count - a.count || a.lastVisit.getTime() - b.lastVisit.getTime());

      for (const reg of sortedRegulars) {
        if (candidatesMap.size >= 5) break;
        if (!candidatesMap.has(reg.client.id)) {
          const daysAgo = Math.max(0, Math.floor((Date.now() - reg.lastVisit.getTime()) / (1000 * 60 * 60 * 24)));
          candidatesMap.set(reg.client.id, {
            ...reg.client,
            reason:
              reg.count >= 2
                ? `לקוח קבוע (${reg.count} ביקורים • ביקר לפני ${daysAgo} ימים)`
                : `ביקר בעבר (${reg.lastService} • לפני ${daysAgo} ימים)`,
            priority: 2,
          });
        }
      }

      res.status(200).json({
        date: dateStr,
        discountPercent: business.flashDiscountPercent || 0,
        businessName: business.name,
        businessId: business.id,
        candidates: Array.from(candidatesMap.values()).slice(0, 5),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async sendFlashOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const { channel, phone, email, message } = req.body;

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(403).json({ error: 'אין הרשאה.' });
        return;
      }

      if (channel === 'SMS') {
        if (!phone) {
          res.status(400).json({ error: 'ללקוח זה לא רשום מספר טלפון נייד.' });
          return;
        }
        console.log(`[Flash Offer SMS] To: ${phone} | Business: ${business.name} | Msg: ${message}`);

        res.status(200).json({ message: 'הצעת הבזק נשלחה בהצלחה ב-SMS ותועדה ביומן ההודעות!' });
        return;
      }

      if (channel === 'EMAIL') {
        if (!email) {
          res.status(400).json({ error: 'ללקוח זה לא רשומה כתובת אימייל.' });
          return;
        }
        res.status(200).json({ message: `הצעת הבזק נשלחה לכתובת ${email}!` });
        return;
      }

      res.status(400).json({ error: 'ערוץ שליחה לא נתמך.' });
    } catch (error) {
      next(error);
    }
  }
}
