import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';
import { QueueService } from '../Services/queueService';
import { NotificationService } from '../Services/notificationService';
import jwt from 'jsonwebtoken';
import { GoogleCalendarController } from './googleCalendarController';

import { isCurrentlyShabbat } from '../Utils/shabbatHelper';

export class AppointmentController {

  public static async getAppointmentByConfirmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token || '').trim();
      if (!token) {
        res.status(400).json({ error: 'קישור אימות לא תקין.' });
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { confirmToken: token },
        include: {
          business: { select: { id: true, name: true, address: true, imageUrl: true } },
          service: { select: { id: true, name: true, price: true, durationMinutes: true } },
          client: { select: { name: true } }
        }
      });

      if (!appointment) {
        res.status(404).json({ error: 'התור לא נמצא או שפג תוקפו של הקישור.' });
        return;
      }

      const [enriched] = await AppointmentController.enrichMultiServiceAppointments([appointment]);

      res.status(200).json({
        appointment: {
          id: enriched.id,
          date: enriched.date,
          startTime: enriched.startTime,
          endTime: enriched.endTime,
          status: enriched.status,
          clientConfirmed: enriched.clientConfirmed,
          staffName: enriched.staffName,
          clientName: enriched.client?.name || 'לקוח/ה',
          business: enriched.business,
          service: enriched.service
        }
      });
    } catch (error) {
      next(error);
    }
  }
  public static async processQuickConfirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = String(req.params.token || '').trim();
      const action = String(req.body.action || '').toUpperCase();

      if (!token || !['CONFIRM', 'CANCEL'].includes(action)) {
        res.status(400).json({ error: 'בקשה לא תקינה.' });
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { confirmToken: token },
        include: {
          business: true,
          client: true,
          service: true
        }
      });

      if (!appointment) {
        res.status(404).json({ error: 'התור לא נמצא במערכת.' });
        return;
      }

      if (appointment.status === 'CANCELED') {
        res.status(400).json({ error: 'תור זה כבר בוטל בעבר.' });
        return;
      }

      if (appointment.status === 'PAID') {
        res.status(400).json({ error: 'תור זה כבר הושלם.' });
        return;
      }

      const dateStr = new Date(appointment.date).toLocaleDateString('he-IL');

      if (action === 'CONFIRM') {
        const updated = await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            clientConfirmed: true,
            status: 'CONFIRMED'
          }
        });

        await NotificationService.notifyUser({
          userId: appointment.business.ownerId,
          businessId: appointment.businessId,
          title: '✅ לקוח אישר הגעה לתור',
          message: `${appointment.client?.name || 'לקוח/ה'} אישר/ה הגעה לתור (${appointment.service?.name || 'טיפול'}) בתאריך ${dateStr} בשעה ${appointment.startTime}.`,
          type: 'INFO',
          skipExternal: true
        });

        res.status(200).json({
          message: 'הגעתך אושרה בהצלחה! מחכים לראותך.',
          status: updated.status,
          clientConfirmed: updated.clientConfirmed
        });
        return;
      }
      if (appointment.business.cancellationHours > 0) {
        const appDateTime = new Date(appointment.date);
        const [startH, startM] = appointment.startTime.split(':').map(Number);
        appDateTime.setHours(startH, startM, 0, 0);
        const hoursLeft = (appDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursLeft < appointment.business.cancellationHours) {
          res.status(400).json({
            error: `על פי מדיניות בית העסק, ניתן לבטל תור עצמאית עד ${appointment.business.cancellationHours} שעות מראש בלבד. לביטול דחוף אנא צור קשר טלפוני עם העסק.`
          });
          return;
        }
      }

      const canceled = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELED',
          clientConfirmed: false
        }
      });

      const ownerUser = await prisma.user.findUnique({ where: { id: appointment.business.ownerId } });
      if (ownerUser) {
        await NotificationService.notifyUser({
          userId: ownerUser.id,
          businessId: appointment.businessId,
          phone: ownerUser.phone,
          title: '⚠️ תור בוטל דרך קישור התזכורת',
          message: `הלקוח/ה ${appointment.client?.name || ''} ביטל/ה את התור ל-${appointment.service?.name || 'טיפול'} בתאריך ${dateStr} בשעה ${appointment.startTime}. השעה התפנתה מחדש ביומן.`,
          type: 'CANCEL'
        });
      }

      res.status(200).json({
        message: 'התור בוטל בהצלחה והשעה שוחררה ביומן.',
        status: canceled.status,
        clientConfirmed: false
      });
    } catch (error) {
      next(error);
    }
  }
  public static async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.query.businessId);
      const rawServiceIds = String(req.query.serviceId || '');
      const serviceIds = rawServiceIds.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
      const dateStr = String(req.query.date);
      const staffId = req.query.staffId ? Number(req.query.staffId) : null;

      if (!businessId || serviceIds.length === 0 || !dateStr) {
        res.status(400).json({ error: 'שדות חובה חסרים לקבלת שעות פנויות.' });
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (business && (await isCurrentlyShabbat(business.latitude, business.longitude))) {
        res.status(200).json({
          slots: [],
          isShabbatNow: true,
          message: 'שבת שלום! לא ניתן לקבוע תורים במהלך השבת. המערכת תיפתח מיד עם צאת השבת.',
        });
        return;
      }

      const slots = await QueueService.getAvailableSlots(businessId, serviceIds, dateStr, staffId);
      res.status(200).json({ slots });
    } catch (error: any) {
      if (error.message === 'BUSINESS_CLOSED_TODAY') {
        res.status(200).json({ slots: [], closedToday: true });
      } else {
        next(error);
      }
    }
  }


  public static async bookAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, serviceId, serviceIds, staffId, date, startTime } = req.body;

      const parsedServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0
        ? serviceIds.map(Number)
        : [Number(serviceId)];
   
      const clientId = Number((req as any).user?.id || (req as any).user?.userId);

      if (!businessId || !serviceId || !date || !startTime) {
        res.status(400).json({ error: 'כל השדות הינם חובה: מזהה עסק, שירות, תאריך ושעה.' });
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const targetDate = new Date(String(date));
      const maxFutureDate = new Date(startOfToday);
      maxFutureDate.setDate(maxFutureDate.getDate() + 60);

      if (targetDate > maxFutureDate) {
        res.status(400).json({ error: 'ניתן לקבוע תורים עד 60 ימים מראש בלבד.' });
        return;
      }

      const clientFutureApps = await prisma.appointment.findMany({
        where: {
          clientId: clientId,
          status: { in: ['CONFIRMED', 'PENDING'] },
          date: { gte: startOfToday }
        }
      });

      const activeUpcomingApps = clientFutureApps.filter((app) => {
        const appEnd = new Date(app.date);
        const [endH, endM] = (app.endTime || '23:59').split(':').map(Number);
        appEnd.setHours(endH, endM, 0, 0);
        return appEnd > now;
      });

      if (activeUpcomingApps.length >= 3) {
        res.status(400).json({
          error: 'ניתן להחזיק עד 3 תורים עתידיים פעילים במקביל. לאחר שאחד התורים יסתיים או יבוטל, תוכל לקבוע תור חדש.'
        });
        return;
      }

      const targetDateStr = targetDate.toISOString().split('T')[0];
      const hasSameDayBusinessApp = activeUpcomingApps.some((app) => {
        const appDateStr = new Date(app.date).toISOString().split('T')[0];
        return appDateStr === targetDateStr && app.businessId === Number(businessId);
      });

      if (hasSameDayBusinessApp) {
        res.status(400).json({
          error: 'כבר קיים לך תור פעיל בעסק זה בתאריך המבוקש.'
        });
        return;
      }
      const targetBiz = await prisma.business.findUnique({ where: { id: Number(businessId) } });
      if (targetBiz && (await isCurrentlyShabbat(targetBiz.latitude, targetBiz.longitude))) {
        res.status(403).json({
          error: 'שבת שלום! לא ניתן לקבוע תורים במהלך השבת. המערכת תיפתח אוטומטית מיד עם צאת השבת.',
        });
        return;
      }

      const newAppointment = await QueueService.createAppointment({
        userId: clientId,
        businessId: Number(businessId),
        serviceId: parsedServiceIds[0],
        serviceIds: parsedServiceIds,
        staffId: staffId ? Number(staffId) : null,
        dateStr: String(date),
        startTime: String(startTime)
      });
      if (targetBiz?.smartBiEnabled && clientId) {
        const bookingClient = await prisma.user.findUnique({ where: { id: Number(clientId) } });
        if (bookingClient && (bookingClient.noShowCount || 0) >= (targetBiz.maxNoShowsAllowed || 2)) {
          await prisma.appointment.update({
            where: { id: newAppointment.id },
            data: { status: 'PENDING' },
          });
        }
      }

      const ownerUser = await prisma.user.findUnique({ where: { id: newAppointment.business.ownerId } });
      const clientUser = await prisma.user.findUnique({ where: { id: clientId } });
      await GoogleCalendarController.syncAppointmentToGoogle(Number(businessId), {
        ...newAppointment,
        client: clientUser,
      });

      const staffNote = newAppointment.staffName ? ` אצל ${newAppointment.staffName}` : '';
      const formattedDate = new Date(newAppointment.date).toLocaleDateString('he-IL');

      if (ownerUser) {
        await NotificationService.notifyUser({
          userId: ownerUser.id,
          businessId: Number(businessId),
          phone: ownerUser.phone,
          title: '📅 תור חדש נקבע ביומן',
          message: `${clientUser?.name || 'לקוח'} קבע תור ל-${newAppointment.service.name}${staffNote} בתאריך ${formattedDate} בשעה ${newAppointment.startTime}.`,
          type: 'BOOKING'
        });
      }

      if (clientUser) {
        await NotificationService.notifyUser({
          userId: clientUser.id,
          businessId: Number(businessId),
          phone: clientUser.phone,
          title: '✅ התור שלך אושר',
          message: `התור שלך ב-${newAppointment.business.name}${staffNote} נקבע לתאריך ${formattedDate} בשעה ${newAppointment.startTime}.`,
          type: 'BOOKING'
        });
      }

      await prisma.favorite.upsert({
        where: {
          userId_businessId: {
            userId: clientId,
            businessId: Number(businessId)
          }
        },
        update: {},
        create: {
          userId: clientId,
          businessId: Number(businessId)
        }
      });

      res.status(201).json({ 
        message: 'Appointment booked successfully.', 
        appointment: newAppointment 
      });
    } catch (error: any) {
      if (error.message === 'The requested time slot is no longer available.') {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'Concurrency Conflict: Another user just booked this exact slot. Please choose another time.' });
        return;
      }
      next(error);
    }
  }
  public static async bookManualAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const { clientName, clientPhone, serviceIds, staffId, date, startTime } = req.body;

      if (!ownerId || isNaN(ownerId)) {
        res.status(401).json({ error: 'אינך מחובר למערכת.' });
        return;
      }

      if (!clientName || !clientPhone || !serviceIds || serviceIds.length === 0 || !date || !startTime) {
        res.status(400).json({ error: 'יש למלא את כל פרטי הלקוח, השירות, התאריך והשעה.' });
        return;
      }

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק משויך למשתמש זה.' });
        return;
      }

      const cleanPhone = String(clientPhone).trim();
      const cleanName = String(clientName).trim();

      let clientUser = await prisma.user.findFirst({
        where: { phone: cleanPhone }
      });

      if (!clientUser) {
        const placeholderEmail = `phone_${cleanPhone.replace(/[^0-9]/g, '')}_${Date.now()}@manual.smartqueue.local`;
        clientUser = await prisma.user.create({
          data: {
            name: cleanName,
            phone: cleanPhone,
            email: placeholderEmail,
            password: 'MANUAL_PHONE_BOOKING_NO_PASSWORD',
            role: 'CLIENT'
          }
        });
      }

      const parsedServiceIds = Array.isArray(serviceIds) ? serviceIds.map(Number) : [Number(serviceIds)];

      const newAppointment = await QueueService.createAppointment({
        userId: clientUser.id,
        businessId: business.id,
        serviceId: parsedServiceIds[0],
        serviceIds: parsedServiceIds,
        staffId: staffId ? Number(staffId) : null,
        dateStr: String(date),
        startTime: String(startTime)
      });

      await GoogleCalendarController.syncAppointmentToGoogle(business.id, {
        ...newAppointment,
        client: clientUser,
      });

      res.status(201).json({
        message: 'התור הידני שוריין בהצלחה ביומן!',
        appointment: newAppointment
      });
    } catch (error: any) {
      if (error.message && (error.message.includes('not available') || error.message.includes('taken'))) {
        res.status(409).json({ error: 'השעה שנבחרה כבר תפוסה אצל איש צוות זה. אנא בחר שעה אחרת.' });
        return;
      }
      next(error);
    }
  }

  public static async cancelAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentId = Number(req.params.id);
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { business: true, client: true, service: true }
      });

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found.' });
        return;
      }

      if (userRole !== 'BUSINESS_OWNER' && appointment.clientId !== userId) {
        res.status(403).json({ error: 'Access denied. You do not have permission to cancel this appointment.' });
        return;
      }
      if (userRole === 'CLIENT' && appointment.business.cancellationHours > 0) {
        const appDateTime = new Date(appointment.date);
        const [startH, startM] = appointment.startTime.split(':').map(Number);
        appDateTime.setHours(startH, startM, 0, 0);
        const hoursLeft = (appDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursLeft < appointment.business.cancellationHours) {
          res.status(400).json({
            error: `על פי מדיניות בית העסק, ניתן לבטל תור עצמאית עד ${appointment.business.cancellationHours} שעות מראש בלבד. לביטול דחוף אנא צור קשר טלפוני עם העסק.`
          });
          return;
        }
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELED' }
      });

      const ownerUser = await prisma.user.findUnique({ where: { id: appointment.business.ownerId } });
      const dateStr = new Date(appointment.date).toLocaleDateString('he-IL');
      if (ownerUser) {
        await NotificationService.notifyUser({
          userId: ownerUser.id,
          businessId: appointment.businessId,
          phone: ownerUser.phone,
          title: '⚠️ תור בוטל ביומן',
          message: `הלקוח/ה ${appointment.client?.name || ''} ביטל/ה את התור ל-${appointment.service?.name || 'טיפול'} בתאריך ${dateStr} בשעה ${appointment.startTime}. השעה התפנתה מחדש.`,
          type: 'CANCEL'
        });
      }

      if (appointment.client) {
        await NotificationService.notifyUser({
          userId: appointment.client.id,
          businessId: appointment.businessId,
          phone: appointment.client.phone,
          email: appointment.client.email,
          title: '❌ התור שלך בוטל',
          message: `התור שלך ב-${appointment.business.name} ל-${appointment.service?.name || 'טיפול'} בתאריך ${dateStr} בשעה ${appointment.startTime} בוטל בהצלחה. המשבצת שוחררה ביומן.`,
          type: 'CANCEL'
        });
      }

      res.status(200).json({ message: 'Appointment canceled successfully.', appointment: updatedAppointment });
    } catch (error) {
      next(error);
    }
  }
  public static async getBusinessSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, date } = req.query;

      if (!businessId || !date) {
        res.status(400).json({ error: 'Missing parameters: businessId and date are required.' });
        return;
      }

      const startOfDay = new Date(String(date));
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(String(date));
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          businessId: Number(businessId),
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          client: {
            select: {
              name: true,
              phone: true,
              email: true
            }
          },
          service: {
            select: {
              name: true,
              price: true,
              durationMinutes: true
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      res.status(200).json({ appointments });
    } catch (error) {
      next(error);
    }
  }

  public static async getBusinessOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const dateStr = req.query.date as string | undefined;
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;

      if (!dateStr && (!startDateStr || !endDateStr)) {
        res.status(400).json({ error: 'יש לספק תאריך או טווח תאריכים לשליפת היומן.' });
        return;
      }

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק משויך למשתמש זה.' });
        return;
      }
      await AppointmentController.autoCompletePastAppointments(business.id);

      const rangeStart = new Date(startDateStr || dateStr!);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(endDateStr || dateStr!);
      rangeEnd.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          businessId: business.id,
          date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        include: {
          client: { select: { id: true, name: true, phone: true, email: true, reliabilityScore: true, noShowCount: true } },

          service: { select: { name: true, price: true, durationMinutes: true } },
          staff: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      const enrichedAppointments = await AppointmentController.enrichMultiServiceAppointments(appointments);
      const waitlist: any[] = [];

      res.status(200).json({ appointments: enrichedAppointments, waitlist });
    } catch (error) {
      next(error);
    }
  }


  public static async getClientAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!clientId || isNaN(clientId)) {
        res.status(401).json({ error: 'משתמש לא מורשה במערכת.' });
        return;
      }

      await AppointmentController.autoCompletePastAppointments({ clientId });

      const appointments = await prisma.appointment.findMany({
        where: {
          clientId: clientId,
          status: { in: ['CONFIRMED', 'PENDING', 'PAID', 'CANCELED'] }
        },
        include: {
          business: {
            select: {
              name: true,
              address: true,
              imageUrl: true
            }
          },
          service: {
            select: {
              name: true,
              price: true,
              durationMinutes: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      const enrichedAppointments = await AppointmentController.enrichMultiServiceAppointments(appointments);
      const now = new Date();
      const isPastDue = (app: { date: Date; endTime: string | null }) => {
        const appEnd = new Date(app.date);
        const [endH, endM] = (app.endTime || '23:59').split(':').map(Number);
        appEnd.setHours(endH, endM, 0, 0);
        return appEnd.getTime() <= now.getTime();
      };

      const active = enrichedAppointments.filter(
        (app) => (app.status === 'CONFIRMED' || app.status === 'PENDING') && !isPastDue(app)
      );
      const history = enrichedAppointments.filter(
        (app) => app.status === 'PAID' || app.status === 'CANCELED' || isPastDue(app)
      );

      res.status(200).json({ appointments: enrichedAppointments, active, history });
    } catch (error) {
      next(error);
    }
  }
  public static async approveAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentId = Number(req.body.appointmentId || req.params.id);
      const activeUserId = Number((req as any).user?.userId || (req as any).user?.id);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'מזהה תור לא תקין.' });
        return;
      }

      const currentApp = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!currentApp) {
        res.status(404).json({ error: 'התור המבוקש לא נמצא במערכת.' });
        return;
      }

      const activeAppointmentsCount = await prisma.appointment.count({
        where: {
          status: 'CONFIRMED',
          date: currentApp.date,
          ...((currentApp as any).userId ? { userId: activeUserId } : { customerId: activeUserId })
        }
      });

      if (activeAppointmentsCount >= 2) {
        res.status(400).json({ 
          error: 'על מנת לשמור על זמינות היומן עבור שאר הלקוחות, לא ניתן לשריין יותר מ-2 תורים באותו היום.' 
        });
        return;
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' }
      });

      await prisma.favorite.upsert({
        where: {
          userId_businessId: {
            userId: activeUserId,
            businessId: currentApp.businessId
          }
        },
        update: {},
        create: {
          userId: activeUserId,
          businessId: currentApp.businessId
        }
      });

      res.status(200).json({ 
        message: 'התור אושר בהצלחה והעסק נשמר במועדפים!', 
        appointment: updatedAppointment 
      });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentId = Number(req.params.id);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { business: true, client: true, service: true }
      });

      if (!appointment || appointment.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לבצע פעולה זו.' });
        return;
      }

      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELED' }
      });

      if (appointment.client) {
        const dateStr = new Date(appointment.date).toLocaleDateString('he-IL');
        await NotificationService.notifyUser({
          userId: appointment.client.id,
          businessId: appointment.businessId,
          phone: appointment.client.phone,
          title: '❌ התור שלך בוטל',
          message: `התור שלך ב-${appointment.business.name} לתאריך ${dateStr} בשעה ${appointment.startTime} בוטל על ידי בית העסק.`,
          type: 'CANCEL'
        });
      }

      res.status(200).json({ message: 'התור נדחה ובוטל בהצלחה.', appointment: updated });
    } catch (error) {
      next(error);
    }
  }

  public static async convertWaitlistToAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const waitlistId = Number(req.params.waitlistId);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const db: any = prisma;
      if (!db.waitlist) {
        res.status(400).json({ error: 'מערכת רשימת ההמתנה נמצאת בתהליך עדכון בבסיס הנתונים.' });
        return;
      }

      const waitlistItem = await db.waitlist.findUnique({
        where: { id: waitlistId },
        include: { business: true }
      });

      if (!waitlistItem || waitlistItem.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לבצע שיבוץ זה.' });
        return;
      }

      const availableSlots = await QueueService.getAvailableSlots(
        waitlistItem.businessId,
        waitlistItem.serviceId,
        waitlistItem.date.toISOString().split('T')
      );

      if (availableSlots.length === 0) {
        res.status(400).json({ error: 'לא נמצאו חלונות זמן פנויים לשיבוץ אוטומטי ביום זה.' });
        return;
      }

      const startTime = availableSlots[0];
      const service = await prisma.service.findUnique({ where: { id: waitlistItem.serviceId } });
      const duration = service ? service.durationMinutes : 30;
      
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + duration;
      const endTime = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

      const createdAppointment = await prisma.$transaction(async (tx) => {
        const appointment = await tx.appointment.create({
          data: {
            businessId: waitlistItem.businessId,
            clientId: waitlistItem.clientId,
            serviceId: waitlistItem.serviceId,
            date: waitlistItem.date,
            startTime,
            endTime,
            status: 'CONFIRMED'
          }
        });

        const txDb: any = tx;
        await txDb.waitlist.delete({
          where: { id: waitlistId }
        });

        return appointment;
      });

      const waitlistClient = await prisma.user.findUnique({ where: { id: waitlistItem.clientId } });
      await GoogleCalendarController.syncAppointmentToGoogle(waitlistItem.businessId, {
        ...createdAppointment,
        client: waitlistClient,
        service,
      });

      res.status(200).json({ message: 'הלקוח שובץ בהצלחה בתור הפנוי הראשון בבוקר.' });
    } catch (error) {
      next(error);
    }
  }
  public static async getFinancialReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const currentBusiness = await prisma.business.findFirst({ where: { ownerId } });
      if (!currentBusiness) {
        res.status(404).json({ error: 'לא נמצא עסק משויך למשתמש זה.' });
        return;
      }
      await AppointmentController.autoCompletePastAppointments(currentBusiness.id);

      let estimatedRevenue = 0;
      let confirmedCash = 0;
      let leakedRevenue = 0;
      
      const monthlyTrends: { [key: string]: number } = {};
      const serviceStats: { [key: string]: { name: string, count: number, totalEarned: number } } = {};

      const allApps = await prisma.appointment.findMany({
        where: { businessId: currentBusiness.id },
        include: { service: true }
      });

      const enrichedApps = await AppointmentController.enrichMultiServiceAppointments(allApps);

      enrichedApps.forEach(app => {
        const price = app.service?.price || 0;
        const serviceName = app.service?.name || 'שירות כללי';

        if (app.status === 'CANCELED') {
          leakedRevenue += price;
        } else {
          estimatedRevenue += price;

          if (app.status === 'PAID') {
            confirmedCash += price;

            if (app.date) {
              const appDate = new Date(app.date);
              const monthKey = `${String(appDate.getMonth() + 1).padStart(2, '0')}/${appDate.getFullYear()}`;
              monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + price;
            }

            if (app.serviceId) {
              if (!serviceStats[app.serviceId]) {
                serviceStats[app.serviceId] = { name: serviceName, count: 0, totalEarned: 0 };
              }
              serviceStats[app.serviceId].count += 1;
              serviceStats[app.serviceId].totalEarned += price;
            }
          }
        }
      });

      const trendsArray = Object.keys(monthlyTrends).sort().map(key => ({
        month: key,
        amount: monthlyTrends[key]
      }));

      const topServicesArray = Object.values(serviceStats)
        .sort((a, b) => b.totalEarned - a.totalEarned);

      res.status(200).json({
        estimatedRevenue,
        confirmedCash,
        leakedRevenue,
        totalAppointments: allApps.filter(a => a.status !== 'CANCELED').length,
        paidAppointmentsCount: allApps.filter(a => a.status === 'PAID').length,
        monthlyTrends: trendsArray,
        topServices: topServicesArray
      });
    } catch (error) {
      next(error);
    }
  }

  public static async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentId = parseInt(String(req.params.id), 10);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'מזהה תור לא תקין.' });
        return;
      }

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו.' });
        return;
      }

      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, businessId: business.id }
      });

      if (!appointment) {
        res.status(404).json({ error: 'התור לא נמצא בעסק שלך.' });
        return;
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'PAID' as any }
      });

      res.status(200).json({ 
        message: 'התשלום עודכן בהצלחה.', 
        appointment: updatedAppointment 
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBusinessAppointmentsByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.businessId);
      const { date } = req.query;

      let dateFilter = {};

      if (date) {
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.997Z`);

        dateFilter = {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        };
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          businessId,
          ...dateFilter
        },
        include: {
          service: true
        }
      });

      res.status(200).json({ appointments });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointmentId = parseInt(String(req.params.id), 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'מזהה תור לא תקין.' });
        return;
      }

      await prisma.appointment.delete({
        where: { id: appointmentId }
      });

      res.status(200).json({ message: 'התור נמחק לצמיתות ממסד הנתונים.' });
    } catch (error) {
      next(error);
    }
  }

  private static async autoCompletePastAppointments(
    businessIdOrScope: number | { businessId?: number; clientId?: number }
  ): Promise<void> {
    const scope = typeof businessIdOrScope === 'number'
      ? { businessId: businessIdOrScope }
      : businessIdOrScope;

    const now = new Date();
    const confirmedApps = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        ...(scope.businessId ? { businessId: scope.businessId } : {}),
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
      }
    });

    const expiredIds: number[] = [];

    for (const app of confirmedApps) {
      const appDate = new Date(app.date);
      const [endHour, endMinute] = (app.endTime || '23:59').split(':').map(Number);
      appDate.setHours(endHour, endMinute, 0, 0);

      if (appDate < now) {
        expiredIds.push(app.id);
      }
    }

    if (expiredIds.length > 0) {
      await prisma.appointment.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'PAID' }
      });
    }
  }

  private static async enrichMultiServiceAppointments(appointments: any[]): Promise<any[]> {
    const businessIds = [...new Set(appointments.map(a => a.businessId))];
    const allServices = await prisma.service.findMany({
      where: { businessId: { in: businessIds } }
    });

    return appointments.map(app => {
      if (!app.service || !app.startTime || !app.endTime) return app;

      const [sH, sM] = app.startTime.split(':').map(Number);
      const [eH, eM] = app.endTime.split(':').map(Number);
      const actualDuration = (eH * 60 + eM) - (sH * 60 + sM);

      if (actualDuration > app.service.durationMinutes) {
        const remainingDuration = actualDuration - app.service.durationMinutes;
        const secondService = allServices.find(
          s => s.businessId === app.businessId && s.id !== app.serviceId && s.durationMinutes === remainingDuration
        );

        if (secondService) {
          return {
            ...app,
            service: {
              ...app.service,
              name: `${app.service.name} + ${secondService.name}`,
              price: app.service.price + secondService.price,
              durationMinutes: actualDuration
            }
          };
        }
      }

      return app;
    });
  }
  private static quickBookAttempts = new Map<string, { count: number; resetAt: number }>();

  public static async quickBookAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. הגנת Rate Limit: מקסימום 5 ניסיונות קביעה מהירה בשעה מאותה כתובת IP
      const clientIp = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
      const nowMs = Date.now();
      const record = AppointmentController.quickBookAttempts.get(clientIp);

      if (record && nowMs < record.resetAt) {
        if (record.count >= 5) {
          res.status(429).json({ error: 'בוצעו יותר מדי ניסיונות קביעה מהירה. אנא נסה שוב בעוד כשעה או התחבר לחשבונך.' });
          return;
        }
        record.count += 1;
      } else {
        AppointmentController.quickBookAttempts.set(clientIp, { count: 1, resetAt: nowMs + 60 * 60 * 1000 });
      }

      const { businessId, serviceId, serviceIds, staffId, date, startTime, clientName, clientPhone } = req.body;

      const parsedServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0
        ? serviceIds.map(Number)
        : [Number(serviceId)];

      const cleanName = String(clientName || '').trim();
      const cleanPhone = String(clientPhone || '').trim();

      if (!businessId || parsedServiceIds.length === 0 || !date || !startTime || !cleanName || !cleanPhone) {
        res.status(400).json({ error: 'יש למלא שם מלא, טלפון, שירות, תאריך ושעה.' });
        return;
      }

      const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      if (phoneDigits.length < 9) {
        res.status(400).json({ error: 'מספר הטלפון שהוזן אינו תקין.' });
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const targetDate = new Date(String(date));
      const maxFutureDate = new Date(startOfToday);
      maxFutureDate.setDate(maxFutureDate.getDate() + 60);

      if (targetDate > maxFutureDate) {
        res.status(400).json({ error: 'ניתן לקבוע תורים עד 60 ימים מראש בלבד.' });
        return;
      }

      // בדיקה האם המשתמש כבר קיים במערכת
      let clientUser = await prisma.user.findFirst({
        where: { phone: cleanPhone }
      });

      const isExistingUser = Boolean(clientUser);

      if (!clientUser) {
        const placeholderEmail = `quick_${phoneDigits}_${Date.now()}@smartqueue.local`;
        clientUser = await prisma.user.create({
          data: {
            name: cleanName,
            phone: cleanPhone,
            email: placeholderEmail,
            password: 'QUICK_BOOKING_NO_PASSWORD',
            role: 'CLIENT'
          }
        });
      }

      const clientFutureApps = await prisma.appointment.findMany({
        where: {
          clientId: clientUser.id,
          status: { in: ['CONFIRMED', 'PENDING'] },
          date: { gte: startOfToday }
        }
      });

      const activeUpcomingApps = clientFutureApps.filter((app) => {
        const appEnd = new Date(app.date);
        const [endH, endM] = (app.endTime || '23:59').split(':').map(Number);
        appEnd.setHours(endH, endM, 0, 0);
        return appEnd > now;
      });

      if (activeUpcomingApps.length >= 3) {
        res.status(400).json({ error: 'כבר קיימים לך 3 תורים עתידיים פעילים במערכת.' });
        return;
      }

      const targetDateStr = targetDate.toISOString().split('T');
      const hasSameDayBusinessApp = activeUpcomingApps.some((app) => {
        const appDateStr = new Date(app.date).toISOString().split('T');
        return appDateStr === targetDateStr && app.businessId === Number(businessId);
      });

      if (hasSameDayBusinessApp) {
        res.status(400).json({ error: 'כבר קיים לך תור פעיל בעסק זה בתאריך המבוקש.' });
        return;
      }

      const newAppointment = await QueueService.createAppointment({
        userId: clientUser.id,
        businessId: Number(businessId),
        serviceId: parsedServiceIds[0],
        serviceIds: parsedServiceIds,
        staffId: staffId ? Number(staffId) : null,
        dateStr: String(date),
        startTime: String(startTime)
      });

      await GoogleCalendarController.syncAppointmentToGoogle(Number(businessId), {
        ...newAppointment,
        client: clientUser,
      });

      const ownerUser = await prisma.user.findUnique({ where: { id: newAppointment.business.ownerId } });
      const staffNote = newAppointment.staffName ? ` אצל ${newAppointment.staffName}` : '';
      const formattedDate = new Date(newAppointment.date).toLocaleDateString('he-IL');

      if (ownerUser) {
        await NotificationService.notifyUser({
          userId: ownerUser.id,
          businessId: Number(businessId),
          phone: ownerUser.phone,
          title: '⚡ תור מהיר חדש נקבע ביומן',
          message: `${clientUser.name} (${cleanPhone}) קבע/ה תור מהיר ל-${newAppointment.service.name}${staffNote} בתאריך ${formattedDate} בשעה ${newAppointment.startTime}.`,
          type: 'BOOKING'
        });
      }

      await NotificationService.notifyUser({
        userId: clientUser.id,
        businessId: Number(businessId),
        phone: clientUser.phone,
        title: '✅ התור שלך אושר',
        message: `התור שלך ב-${newAppointment.business.name}${staffNote} נקבע לתאריך ${formattedDate} בשעה ${newAppointment.startTime}.`,
        type: 'BOOKING'
      });

      await prisma.favorite.upsert({
        where: {
          userId_businessId: {
            userId: clientUser.id,
            businessId: Number(businessId)
          }
        },
        update: {},
        create: {
          userId: clientUser.id,
          businessId: Number(businessId)
        }
      });

      // אבטחה: מחזירים טוקן התחברות אך ורק למשתמש חדש שנוצר הרגע, לעולם לא לחשבון קיים!
      if (!isExistingUser) {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const token = jwt.sign(
          { id: clientUser.id, userId: clientUser.id, role: clientUser.role, email: clientUser.email },
          jwtSecret,
          { expiresIn: '30d' }
        );

        res.status(201).json({
          message: 'התור נקבע בהצלחה!',
          appointment: newAppointment,
          token,
          user: {
            id: clientUser.id,
            name: clientUser.name,
            email: clientUser.email,
            phone: clientUser.phone,
            role: clientUser.role
          }
        });
        return;
      }

      res.status(201).json({
        message: 'התור נקבע בהצלחה! פרטי התור נשלחו אליך לווטסאפ.',
        appointment: newAppointment
      });
    } catch (error: any) {
      if (error.message === 'The requested time slot is no longer available.') {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'השעה נתפסה הרגע על ידי לקוח אחר. אנא בחר שעה אחרת.' });
        return;
      }
      next(error);
    }
  }


}
