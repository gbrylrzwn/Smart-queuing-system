// src/Services/queueService.ts
import prisma from '../Config/db';
import crypto from 'crypto';

export class QueueService {

  /**
   * עוזר אלגוריתמי: הופך שעה בפורמט סטרינג (HH:MM) למספר דקות כולל מתחילת היום
   * משמש לביצוע השוואות מתמטיות קלות בין זמנים (למשל: "09:30" הופך ל-570 דקות)
   */
  public static timeToMinutes(timeStr: string): number {
    // ביטוי רגולרי שמוודא פורמט HH:MM תקין (שעות 00-23, דקות 00-59)
    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

    // אם הקלט לא תקין, נזרוק שגיאה ברורה
    if (!timeStr || !timeRegex.test(timeStr)) {
       throw new Error(`Invalid time format: "${timeStr}". Expected HH:MM between 00:00 and 23:59.`);
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * עוזר אלגוריתמי: הופך מספר דקות כולל חזרה לפורמט שעון סטנדרטי (HH:MM)
   */
  public static minutesToTime(minutes: number): string {
    // הגנה: בדיקה שמספר הדקות אינו שלילי ואינו חורג מטווח הדקות של יממה (0 עד 1439)
    if (minutes < 0 || minutes >= 1440 || isNaN(minutes)) {
      throw new Error(`Invalid minutes value: ${minutes}. Expected a number between 0 and 1439.`);
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

   
  private static async computeSlotsForSchedule(
    schedule: { isOpen: boolean; openTime: string; closeTime: string } | null,
    breaks: { startTime: string; endTime: string }[],
    existingAppointments: { startTime: string; endTime: string }[],
    duration: number
  ): Promise<string[]> {
    if (!schedule || !schedule.isOpen) return [];

    const slots: string[] = [];
    const [openHour, openMin] = schedule.openTime.split(':').map(Number);
    const [closeHour, closeMin] = schedule.closeTime.split(':').map(Number);

    const startTotalMinutes = openHour * 60 + openMin;
    const endTotalMinutes = closeHour * 60 + closeMin;

    // איחוד כל הזמנים החסומים של העובד (תורים קיימים + כל ההפסקות שלו באותו יום)
    const blockedIntervals = [
      ...existingAppointments.map(a => ({ start: a.startTime, end: a.endTime, isBreak: false })),
      ...breaks.map(b => ({ start: b.startTime, end: b.endTime, isBreak: true }))
    ];

    let currentTotal = startTotalMinutes;

    while (currentTotal + duration <= endTotalMinutes) {
      const currentEndTotal = currentTotal + duration;
      let isAvailable = true;
      let jumpToMinutes: number | null = null;

      for (const block of blockedIntervals) {
        const [bStartH, bStartM] = block.start.split(':').map(Number);
        const [bEndH, bEndM] = block.end.split(':').map(Number);
        const bStartTotal = bStartH * 60 + bStartM;
        const bEndTotal = bEndH * 60 + bEndM;

        if (currentTotal < bEndTotal && currentEndTotal > bStartTotal) {
          isAvailable = false;
          if (block.isBreak) {
            jumpToMinutes = bEndTotal;
          }
          break;
        }
      }

      if (!isAvailable && jumpToMinutes !== null && jumpToMinutes > currentTotal) {
        currentTotal = jumpToMinutes;
        continue;
      }

      if (isAvailable) {
        const hourStr = String(Math.floor(currentTotal / 60)).padStart(2, '0');
        const minStr = String(currentTotal % 60).padStart(2, '0');
        slots.push(`${hourStr}:${minStr}`);
      }

      currentTotal += duration;
    }

    return slots;
  }
  private static canMemberPerformServices(member: any, reqServiceIds: number[]): boolean {
    if (!member.services || member.services.length === 0) return true;
    const memberServiceIds = member.services.map((s: any) => s.id);
    return reqServiceIds.every(id => memberServiceIds.includes(Number(id)));
  }

  
  public static async getAvailableSlots(
    businessId: number,
    serviceIds: number[],
    dateStr: string,
    staffId?: number | null
  ): Promise<string[]> {
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day, 12, 0, 0);
    const dayOfWeek = targetDate.getDay();

    const startOfDay = new Date(year, month - 1, day);
    startOfDay.setHours(0, 0, 0, 0);

    // 1. בדיקת שעות הפעילות הכלליות של העסק ליום זה
    const businessHours = await prisma.workingHours.findFirst({
      where: { businessId, day: dayOfWeek }
    });

    if (!businessHours || !businessHours.isOpen) {
      throw new Error('BUSINESS_CLOSED_TODAY');
    }

    // שליפת חסימות זמן וימי חופשה נקודתיים לאותו תאריך
    const dayBlockedTimes = await prisma.blockedTime.findMany({
      where: {
        businessId,
        date: startOfDay
      }
    });

    // 2. סכימת משך הטיפול הכולל של כל השירותים שנבחרו
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    });
    const duration = services.length > 0
      ? services.reduce((sum, srv) => sum + srv.durationMinutes, 0)
      : 30;

    // 3. שליפת אנשי הצוות בעסק כולל המשמרות, ההפסקות והשירותים שלהם
    const allStaff = await prisma.staff.findMany({
      where: { businessId },
      include: {
        workingHours: { where: { day: dayOfWeek } },
        breaks: { where: { day: dayOfWeek } },
        services: { select: { id: true } }
      }
    });

    // מצב א: עסק ללא אנשי צוות רשומים כלל
    if (allStaff.length === 0) {
      const apps = await prisma.appointment.findMany({
        where: { businessId, date: startOfDay, NOT: { status: 'CANCELED' } },
        select: { startTime: true, endTime: true }
      });
      const generalBlocks = dayBlockedTimes.map(b => ({ startTime: b.startTime, endTime: b.endTime }));
      return this.computeSlotsForSchedule(businessHours, generalBlocks, apps, duration);
    }

    // מצב ב: נבחר עובד ספציפי
    if (staffId) {
      const member = allStaff.find(s => s.id === Number(staffId));
      if (!member) return [];
      if (!this.canMemberPerformServices(member, serviceIds)) return [];

      const memberSchedule = member.workingHours.length > 0 ? member.workingHours[0] : businessHours;
      if (!memberSchedule.isOpen) return [];

      const memberApps = await prisma.appointment.findMany({
        where: {
          businessId,
          date: startOfDay,
          NOT: { status: 'CANCELED' },
          OR: [{ staffId: member.id }, { staffId: null }]
        },
        select: { startTime: true, endTime: true }
      });

      const memberBlocks = dayBlockedTimes
        .filter(b => b.staffId === null || b.staffId === member.id)
        .map(b => ({ startTime: b.startTime, endTime: b.endTime }));

      return this.computeSlotsForSchedule(memberSchedule, [...member.breaks, ...memberBlocks], memberApps, duration);
    }

    // מצב ג: נבחר "הראשון שמתפנה" (staffId לא סופק)
    const combinedSlotsSet = new Set<string>();

    for (const member of allStaff) {
      if (!this.canMemberPerformServices(member, serviceIds)) continue;
      const memberSchedule = member.workingHours.length > 0 ? member.workingHours[0] : businessHours;
      if (!memberSchedule.isOpen) continue;

      const memberApps = await prisma.appointment.findMany({
        where: {
          businessId,
          date: startOfDay,
          NOT: { status: 'CANCELED' },
          OR: [{ staffId: member.id }, { staffId: null }]
        },
        select: { startTime: true, endTime: true }
      });

      const memberBlocks = dayBlockedTimes
        .filter(b => b.staffId === null || b.staffId === member.id)
        .map(b => ({ startTime: b.startTime, endTime: b.endTime }));

      const slotsForMember = await this.computeSlotsForSchedule(memberSchedule, [...member.breaks, ...memberBlocks], memberApps, duration);
      slotsForMember.forEach(s => combinedSlotsSet.add(s));
    }

    return Array.from(combinedSlotsSet).sort();
  }

  
  public static async createAppointment(data: {
    userId: number;
    businessId: number;
    serviceId: number;
    serviceIds?: number[];
    staffId?: number | null;
    dateStr: string;
    startTime: string;
  }): Promise<any> {
    const { userId, businessId, serviceId, serviceIds, staffId, dateStr, startTime } = data;
    const idsToCalc = serviceIds && serviceIds.length > 0 ? serviceIds : [Number(serviceId)];

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);

    const [hours, minutes] = startTime.split(':').map(Number);

    // 1. הגנת קצה: חסימת קביעת תור לשעה שכבר עברה ביחס לזמן השרת
    const now = new Date();
    const appointmentStartDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (appointmentStartDateTime <= now) {
      throw new Error('לא ניתן לקבוע תור לשעה שכבר עברה.');
    }

    const services = await prisma.service.findMany({
      where: { id: { in: idsToCalc } }
    });

    if (services.length === 0) {
      throw new Error('The requested service was not found.');
    }

    const totalDuration = services.reduce((sum, srv) => sum + srv.durationMinutes, 0);
    const endMinutesTotal = hours * 60 + minutes + totalDuration;
    const endTimeStr = `${String(Math.floor(endMinutesTotal / 60)).padStart(2, '0')}:${String(endMinutesTotal % 60).padStart(2, '0')}`;

    const newStartTotal = hours * 60 + minutes;
    const newEndTotal = endMinutesTotal;

    // 2. אימות זמינות מלא מול כל האילוצים (שעות פתיחה, הפסקות, חסימות נקודתיות וחפיפות)
    const validSlots = await this.getAvailableSlots(businessId, idsToCalc, dateStr, staffId);
    if (!validSlots.includes(startTime)) {
      throw new Error('The requested time slot is no longer available.');
    }

    // 3. טרנזקציה אטומית למניעת מרוץ כפילויות (Race Condition) באותה שנייה
    return await prisma.$transaction(async (tx) => {
      const allStaff = await tx.staff.findMany({
        where: { businessId },
        include: { services: { select: { id: true } } }
      });

      let assignedStaffId: number | null = staffId ? Number(staffId) : null;
      let assignedStaffName: string | null = null;

      if (allStaff.length > 0) {
        if (assignedStaffId) {
          const member = allStaff.find(s => s.id === assignedStaffId);
          if (!member) throw new Error('איש הצוות שנבחר אינו קיים.');

          const memberApps = await tx.appointment.findMany({
            where: {
              businessId,
              date: targetDate,
              NOT: { status: 'CANCELED' },
              OR: [{ staffId: assignedStaffId }, { staffId: null }]
            }
          });

          const hasConflict = memberApps.some(app => {
            const [aSH, aSM] = app.startTime.split(':').map(Number);
            const [aEH, aEM] = app.endTime.split(':').map(Number);
            return newStartTotal < (aEH * 60 + aEM) && newEndTotal > (aSH * 60 + aSM);
          });

          if (hasConflict) {
            throw new Error('The requested time slot is no longer available.');
          }

          assignedStaffName = member.name;
        } else {
          // מצב "הראשון שמתפנה": איתור עובד פנוי ומוסמך בתוך הטרנזקציה
          let availableMember = null;
          for (const member of allStaff) {
            if (!this.canMemberPerformServices(member, idsToCalc)) continue;
            const slots = await this.getAvailableSlots(businessId, idsToCalc, dateStr, member.id);
            if (slots.includes(startTime)) {
              availableMember = member;
              break;
            }
          }

          if (!availableMember) {
            throw new Error('The requested time slot is no longer available.');
          }

          assignedStaffId = availableMember.id;
          assignedStaffName = availableMember.name;
        }
      } else {
        const businessApps = await tx.appointment.findMany({
          where: { businessId, date: targetDate, NOT: { status: 'CANCELED' } }
        });

        const hasConflict = businessApps.some(app => {
          const [aSH, aSM] = app.startTime.split(':').map(Number);
          const [aEH, aEM] = app.endTime.split(':').map(Number);
          return newStartTotal < (aEH * 60 + aEM) && newEndTotal > (aSH * 60 + aSM);
        });

        if (hasConflict) {
          throw new Error('The requested time slot is no longer available.');
        }
      }

      return await tx.appointment.create({
        data: {
          clientId: userId,
          businessId,
          serviceId: Number(idsToCalc[0]),
          staffId: assignedStaffId,
          staffName: assignedStaffName,
          date: targetDate,
          startTime,
          endTime: endTimeStr,
          status: 'CONFIRMED',
          confirmToken: crypto.randomUUID(),

        },
        include: {
          business: true,
          service: true
        }
      });
    });
  }

  



   
  
}

