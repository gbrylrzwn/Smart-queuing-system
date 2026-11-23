// server/src/Controllers/businessController.ts — חלק 1 מתוך 2
import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';
import { CloudinaryService } from '../Services/cloudinaryService';

export class BusinessController {


  /**
   * 2. הוספת שירות חדש לעסק
   * POST /api/business/:id/services
   */
  public static async addService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const { name, price, durationMinutes } = req.body;
      const ownerId = Number((req as any).user?.userId);

      if (!name || !price || !durationMinutes) {
        res.status(400).json({ error: 'All fields are required: name, price, and durationMinutes.' });
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== ownerId) {
        res.status(403).json({ error: 'Access denied. You are not the owner of this business.' });
        return;
      }

      const newService = await prisma.service.create({
        data: {
          name,
          price: Number(price),
          durationMinutes: Number(durationMinutes),
          businessId
        }
      });

      res.status(201).json({ message: 'New custom service registered successfully.', service: newService });
    } catch (error) {
      next(error);
    }
  }
  // server/src/Controllers/businessController.ts — חלק 2 מתוך 2 (המשך ישיר לחלק 1)
  /**
   * 3. שליפת פרטי העסק יחד עם כל השירותים ושעות הפעילות שלו
   * GET /api/business/:id
   */
  /**
 * 3. שליפת פרטי העסק יחד עם כל השירותים, שעות הפעילות והצוות הדינמי שלו
 * GET /api/business/:id
 */
  public static async getBusinessProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);

      if (!businessId || isNaN(businessId)) {
        res.status(400).json({ error: 'מזהה עסק לא חוקי.' });
        return;
      }

      let businessProfile = null;

      try {
        // ניסיון ראשון: שליפת העסק כולל כל הישויות והצוות הדינמי החדש
        businessProfile = await prisma.business.findUnique({
          where: { id: businessId },
          include: {
            services: true,
            workingHours: true,
            staff: {
              include: {
                workingHours: true,
                breaks: true,
                services: true
              }
            }


          }
        });
      } catch (prismaError) {

        // הגנה מפני קריסה: אם טבלת ה-staff עדיין לא סונכרנה פיזית, נבצע שליפה בסיסית ללא קריסה
        const basicProfile = await prisma.business.findUnique({
          where: { id: businessId },
          include: {
            services: true,
            workingHours: true
          }
        });

        if (basicProfile) {
          businessProfile = {
            ...basicProfile,
            staff: [] // החזרת מערך ריק זמני כדי לא לקרוס
          };
        }
      }

      if (!businessProfile) {
        res.status(404).json({ error: 'פרופיל העסק המבוקש לא נמצא במערכת.' });
        return;
      }

      res.status(200).json({ business: businessProfile });
    } catch (error) {
      next(error); // העברה בטוחה ל-Middleware המרכזי
    }
  }

  public static async getMyBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!ownerId || isNaN(ownerId)) {
        res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
        return;
      }

      let businessProfile: any = null;

      try {
        businessProfile = await prisma.business.findFirst({
          where: { ownerId },
          include: {
            services: true,
            workingHours: true,
            staff: {
              include: {
                workingHours: true,
                breaks: true,
                services: true
              }
            }
          }
        });
      } catch (prismaErr) {
        console.error('Full staff include failed, falling back to basic staff:', prismaErr);
        businessProfile = await prisma.business.findFirst({
          where: { ownerId },
          include: {
            services: true,
            workingHours: true,
            staff: true
          }
        });
      }

      if (!businessProfile) {
        res.status(404).json({ error: 'No business found for this user.', hasBusiness: false });
        return;
      }

      res.status(200).json({ business: businessProfile, hasBusiness: true });
    } catch (error) {
      next(error);
    }
  }



  /**
   * 5. מחיקת פרופיל העסק וכל הנתונים המקושרים אליו (ביטול רישום)
   * DELETE /api/business/delete-my-business
   */
  /**
  * 5. מחיקת פרופיל העסק וכל הנתונים המקושרים אליו (ביטול רישום)
  * DELETE /api/business/delete-my-business
  */
  public static async deleteBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 🔥 התיקון: חילוץ המזהה המדויק לפי ה-userId המסונכרן מהטוקן
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!ownerId || isNaN(ownerId)) {
        res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
        return;
      }

      // מציאת העסק השייך למנהל המחובר
      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(404).json({ error: 'No business profile found for this user.' });
        return;
      }

      // ביצוע מחיקה מדורגת ובטוחה של כל התלויות למניעת שגיאות קשרי ישויות בפריזמה
      await prisma.$transaction(async (tx) => {
        await tx.workingHours.deleteMany({ where: { businessId: business.id } });
        await tx.service.deleteMany({ where: { businessId: business.id } });
        await tx.appointment.deleteMany({ where: { businessId: business.id } });
        await tx.business.delete({ where: { id: business.id } });
      });

      res.status(200).json({ message: 'Business profile and all associated data deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }


  /**
 * שליפת כל העסקים כולל תמונת פרופיל ושירותים לדף הבית
 * GET /api/business
 */
  public static async getAllBusinesses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const businesses = await prisma.business.findMany({
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
          id: true,
          name: true,
          address: true,
          category: true,
          imageUrl: true,
          latitude: true,
          longitude: true,
          services: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      res.status(200).json({ businesses });
    } catch (error) {
      next(error);
    }
  }


  private static async geocodeAddress(address: string): Promise<{ latitude: number | null; longitude: number | null }> {
    try {
      if (!address || address.trim() === '') return { latitude: null, longitude: null };
      const encoded = encodeURIComponent(`${address}, Israel`);
      const url = `https://openstreetmap.org{encoded}&limit=1`;

      const response = await fetch(url, {
        headers: { 'User-Agent': 'SmartQueueApp/1.0' }
      });
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      return { latitude: null, longitude: null };
    } catch (err) {
      console.error('Geocoding failed:', err);
      return { latitude: null, longitude: null };
    }
  }


  /**
   * 7. עדכון פרטי ותמונת העסק של המנהל המחובר + עדכון קואורדינטות GPS לפי הכתובת
   * PUT /api/business/update-my-business
   */
  public static async updateBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const { name, category, address, imageUrl, cancellationHours } = req.body;

      if (!ownerId || isNaN(ownerId)) {
        res.status(401).json({ error: 'Unauthorized. Missing authentication token.' });
        return;
      }

      const business = await prisma.business.findFirst({ where: { ownerId } });
      if (!business) {
        res.status(404).json({ error: 'No business profile found for this user.' });
        return;
      }

      let coords = { latitude: business.latitude, longitude: business.longitude };
      if (address && (address !== business.address || !business.latitude || !business.longitude)) {
        coords = await BusinessController.geocodeAddress(address);
      }
      const uploadedBusinessImage = await CloudinaryService.uploadImageIfNeeded(imageUrl, 'smart-queue/businesses');

      const dataToUpdate: any = {
        name,
        category,
        address,
        imageUrl: uploadedBusinessImage,

        latitude: coords.latitude,
        longitude: coords.longitude
      };

      if (typeof cancellationHours === 'number' && cancellationHours >= 0) {
        dataToUpdate.cancellationHours = cancellationHours;
      }

      const updatedBusiness = await prisma.business.update({
        where: { id: business.id },
        data: dataToUpdate,
        include: { services: true, workingHours: true }
      });

      res.status(200).json({ message: 'Business profile updated successfully.', business: updatedBusiness });
    } catch (error) {
      next(error);
    }
  }


  public static async createBusiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, category, address, imageUrl, workingHours } = req.body;

      const ownerId = Number((req as any).user?.userId);

      if (!ownerId || isNaN(ownerId)) {
        res.status(401).json({ error: 'Unauthorized. Invalid or missing user authentication.' });
        return;
      }

      if (!name || !category || !address) {
        res.status(400).json({ error: 'Missing business information: name, category, and address are required.' });
        return;
      }

      // תרגום אוטומטי של כתובת העסק לקואורדינטות GPS בעת ההקמה
      const coords = await BusinessController.geocodeAddress(address);
      const uploadedBusinessImage = await CloudinaryService.uploadImageIfNeeded(imageUrl, 'smart-queue/businesses');
      const sysSettings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
      const initialStatus = sysSettings?.defaultBusinessStatus || 'TRIAL';
      const trialDays = sysSettings?.defaultTrialDays ?? 14;
      const trialEndsAt =
        initialStatus === 'TRIAL'
          ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
          : null;

      const result = await prisma.$transaction(async (tx) => {
        const newBusiness = await tx.business.create({
          data: {
            name,
            category,
            address,
            imageUrl: uploadedBusinessImage,
            subscriptionStatus: initialStatus,
            trialEndsAt,

            ownerId,
            latitude: coords.latitude,
            longitude: coords.longitude
          }
        });

        const defaultHours = workingHours || Array.from({ length: 7 }, (_, day) => ({
          day,
          isOpen: day !== 6,
          openTime: '09:00',
          closeTime: '17:00',
          breakStart: '13:00',
          breakEnd: '14:00'
        }));

        for (const hours of defaultHours) {
          await tx.workingHours.create({
            data: {
              day: Number(hours.day),
              isOpen: Boolean(hours.isOpen),
              openTime: hours.openTime,
              closeTime: hours.closeTime,
              breakStart: hours.breakStart,
              breakEnd: hours.breakEnd,
              businessId: newBusiness.id
            }
          });
        }

        return await tx.business.findUnique({
          where: { id: newBusiness.id },
          include: { services: true, workingHours: true }
        });
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, email: true, phone: true, role: true }
      });

      res.status(201).json({
        message: 'Business profile created successfully with working hours constraints.',
        business: result,
        user: updatedUser,
        hasBusiness: true
      });
    } catch (error) {
      next(error);
    }
  }

  /**
 * 8. הוספת איש צוות/עובד חדש לעסק בצורה חסינה (כולל שיוך שירותים)
 * POST /api/business/:id/staff
 */
  public static async addStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const { name, imageUrl, serviceIds = [] } = req.body;
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!businessId || isNaN(businessId)) {
        res.status(400).json({ error: 'מזהה עסק לא תקין.' });
        return;
      }

      if (!name || name.trim() === '') {
        res.status(400).json({ error: 'שם העובד הוא שדה חובה.' });
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לבצע פעולה זו.' });
        return;
      }
      const uploadedStaffImage = await CloudinaryService.uploadImageIfNeeded(imageUrl, 'smart-queue/staff');

      const newStaff = await prisma.staff.create({
        data: {
          name: name.trim(),
          imageUrl: uploadedStaffImage,

          businessId: businessId,
          ...(Array.isArray(serviceIds) && serviceIds.length > 0 && {
            services: {
              connect: serviceIds.map((id: number) => ({ id: Number(id) }))
            }
          })
        },
        include: { services: true }
      });

      res.status(201).json({ message: 'העובד התווסף בהצלחה לעסק', staff: newStaff });
    } catch (error) {
      next(error);
    }
  }

  /**
* 9. עדכון מערך שעות הפעילות והאילוצים של העסק
* PUT /api/business/:id/working-hours
*/
  public static async updateWorkingHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const { workingHours } = req.body;
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!businessId || isNaN(businessId)) {
        res.status(400).json({ error: 'מזהה עסק לא תקין.' });
        return;
      }

      // אימות בעלות על העסק
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך מורשה לעדכן את שעות הפעילות של עסק זה.' });
        return;
      }

      // עדכון בתוך טרנזקציה: מחיקת השעות הישנות והזרקת החדשות
      await prisma.$transaction(async (tx) => {
        await tx.workingHours.deleteMany({ where: { businessId } });

        for (const hours of workingHours) {
          await tx.workingHours.create({
            data: {
              day: Number(hours.day),
              isOpen: Boolean(hours.isOpen),
              openTime: hours.openTime,
              closeTime: hours.closeTime,
              breakStart: hours.breakStart || null,
              breakEnd: hours.breakEnd || null,
              businessId
            }
          });
        }
      });

      res.status(200).json({ message: 'שעות הפעילות עודכנו בהצלחה במערכת.' });
    } catch (error) {
      next(error);
    }
  }
  /**
  * 10. עדכון שירות קיים במחירון העסק
  * PUT /api/business/services/:serviceId
  */
  public static async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceId = Number(req.params.serviceId);
      const { name, price, durationMinutes } = req.body;
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { business: true }
      });

      if (!service || service.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לעדכן שירות זה.' });
        return;
      }

      const updated = await prisma.service.update({
        where: { id: serviceId },
        data: {
          name: name || service.name,
          price: price !== undefined ? Number(price) : service.price,
          durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : service.durationMinutes
        }
      });

      res.status(200).json({ message: 'השירות עודכן בהצלחה במחירון.', service: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
 * 11. מחיקת שירות ממחירון העסק בצורה אחראית (חסימה אם קיימים תורים פעילים)
 * DELETE /api/business/services/:serviceId
 */
  public static async deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceId = Number(req.params.serviceId);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!serviceId || isNaN(serviceId)) {
        res.status(400).json({ error: 'מזהה שירות לא תקין.' });
        return;
      }

      // 1. שליפת השירות לבדיקת בעלות
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { business: true }
      });

      if (!service || service.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה למחוק שירות זה.' });
        return;
      }

      // 2. 🔥 הבדיקה העסקית: האם קיימים תורים פעילים (שאינם מבוטלים) המשויכים לשירות זה?
      const activeAppointments = await prisma.appointment.findFirst({
        where: {
          serviceId: serviceId,
          NOT: { status: 'CANCELED' } // תורים מבוטלים לא חוסמים, רק תורים מאושרים/עתידיים
        }
      });

      if (activeAppointments) {
        res.status(400).json({
          error: 'לא ניתן למחוק את השירות מכיוון שקיימים תורים פעילים המשויכים אליו. באחריותך לבטל או להעביר את התורים של הלקוחות לפני הסרת השירות מהמערכת.'
        });
        return;
      }

      // 3. אם אין תורים פעילים, מוחקים בבטחה (כולל ניקוי היסטוריית תורים מבוטלים במידה ויש)
      await prisma.$transaction(async (tx) => {
        await tx.appointment.deleteMany({ where: { serviceId: serviceId } });
        await tx.service.delete({ where: { id: serviceId } });
      });

      res.status(200).json({ message: 'השירות הוסר בהצלחה מהמחירון.' });
    } catch (error) {
      next(error);
    }
  }
  public static async updateStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffId = Number(req.params.staffId);
      const { name, imageUrl, serviceIds } = req.body;
      const uploadedStaffImage = await CloudinaryService.uploadImageIfNeeded(imageUrl, 'smart-queue/staff');

      const updatedStaff = await prisma.staff.update({
        where: { id: staffId },
        data: {
          name,
          imageUrl: uploadedStaffImage,

          ...(Array.isArray(serviceIds) && {
            services: {
              set: serviceIds.map((id: number) => ({ id: Number(id) }))
            }
          })
        },
        include: { services: true }
      });

      res.status(200).json({ message: 'Staff member updated successfully', staff: updatedStaff });
    } catch (error) {
      next(error);
    }
  }


  /**
   * מחיקת איש צוות מהמערכת
   * DELETE /api/business/staff/:staffId
   */
  public static async deleteStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffId = Number(req.params.staffId);

      await prisma.staff.delete({
        where: { id: staffId }
      });

      res.status(200).json({ message: 'Staff member deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
  /**
* עדכון משמרות והפסקות לעובד ספציפי (עם אכיפה קשיחה מול שעות הפתיחה של העסק)
* PUT /api/business/staff/:staffId/working-hours
*/
  public static async updateStaffWorkingHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staffId = Number(req.params.staffId);
      const { workingHours, breaks = [] } = req.body;
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      if (!staffId || isNaN(staffId)) {
        res.status(400).json({ error: 'מזהה עובד לא תקין.' });
        return;
      }

      const staffMember = await prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          business: { include: { workingHours: true } }
        }
      });

      if (!staffMember || staffMember.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לעדכן עובד זה.' });
        return;
      }

      const daysNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

      // 1. בדיקה ששעות העובד לא חורגות משעות הפתיחה והסגירה של העסק
      for (const hours of workingHours) {
        const dayNum = Number(hours.day);
        const businessDay = staffMember.business.workingHours.find(bh => bh.day === dayNum);

        if (hours.isOpen) {
          if (!businessDay || !businessDay.isOpen) {
            res.status(400).json({ error: `לא ניתן להגדיר משמרת ביום ${daysNames[dayNum]} כי העסק סגור.` });
            return;
          }
          if (hours.openTime < businessDay.openTime || hours.closeTime > businessDay.closeTime) {
            res.status(400).json({
              error: `שעות העובד ביום ${daysNames[dayNum]} (${hours.openTime}-${hours.closeTime}) חורגות משעות העסק (${businessDay.openTime}-${businessDay.closeTime}).`
            });
            return;
          }
          if (hours.openTime >= hours.closeTime) {
            res.status(400).json({ error: `שעת הסיום חייבת להיות מאוחרת משעת ההתחלה ביום ${daysNames[dayNum]}.` });
            return;
          }
        }
      }

      // 2. בדיקה שכל ההפסקות נמצאות בתוך שעות המשמרת של העובד
      for (const brk of breaks) {
        const dayNum = Number(brk.day);
        const staffDay = workingHours.find((h: any) => Number(h.day) === dayNum);

        if (!staffDay || !staffDay.isOpen) {
          res.status(400).json({ error: `לא ניתן להגדיר הפסקה ביום ${daysNames[dayNum]} שבו העובד אינו עובד.` });
          return;
        }
        if (brk.startTime < staffDay.openTime || brk.endTime > staffDay.closeTime || brk.startTime >= brk.endTime) {
          res.status(400).json({
            error: `הפסקה (${brk.startTime}-${brk.endTime}) ביום ${daysNames[dayNum]} חייבת להיות בתוך משמרת העובד (${staffDay.openTime}-${staffDay.closeTime}).`
          });
          return;
        }
      }

      // 3. שמירה אטומית של המשמרות וההפסקות
      await prisma.$transaction(async (tx) => {
        await tx.staffWorkingHours.deleteMany({ where: { staffId } });
        await tx.staffBreak.deleteMany({ where: { staffId } });

        for (const hours of workingHours) {
          await tx.staffWorkingHours.create({
            data: {
              staffId,
              day: Number(hours.day),
              isOpen: Boolean(hours.isOpen),
              openTime: hours.openTime || '09:00',
              closeTime: hours.closeTime || '17:00'
            }
          });
        }

        for (const brk of breaks) {
          await tx.staffBreak.create({
            data: {
              staffId,
              day: Number(brk.day),
              startTime: brk.startTime,
              endTime: brk.endTime
            }
          });
        }
      });

      res.status(200).json({ message: 'משמרות והפסקות העובד עודכנו בהצלחה.' });
    } catch (error) {
      next(error);
    }
  }


  /**
 * הוספת עסק לרשימת המועדפים של המשתמש
 * POST /api/business/:id/favorite
 */
  public static async addToFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 🔥 תיקון השגיאה: המרה מפורשת למחרוזת חלקה למניעת ts(2345)
      const businessId = parseInt(String(req.params.id), 10);
      const userId = Number((req as any).user?.userId || (req as any).user?.id);

      if (isNaN(businessId)) {
        res.status(400).json({ error: 'מזהה עסק לא תקין.' });
        return;
      }

      // בדיקה אם העסק כבר קיים במועדפים
      const existing = await prisma.favorite.findUnique({
        where: {
          userId_businessId: { userId, businessId }
        }
      });

      if (existing) {
        res.status(200).json({ message: 'העסק כבר נמצא ברשימת המועדפים שלך.' });
        return;
      }

      // יצירת רשומת מועדף חדשה
      await prisma.favorite.create({
        data: { userId, businessId }
      });

      res.status(201).json({ message: 'העסק הוסף למועדפים בהצלחה!' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * הסרת עסק מרשימת המועדפים של המשתמש
   * DELETE /api/business/:id/favorite
   */
  public static async removeFromFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 🔥 תיקון השגיאה: המרה מפורשת למחרוזת חלקה למניעת ts(2345)
      const businessId = parseInt(String(req.params.id), 10);
      const userId = Number((req as any).user?.userId || (req as any).user?.id);

      if (isNaN(businessId)) {
        res.status(400).json({ error: 'מזהה עסק לא תקין.' });
        return;
      }

      // מחיקת הרשומה לפי המפתח הייחודי
      await prisma.favorite.delete({
        where: {
          userId_businessId: { userId, businessId }
        }
      });

      res.status(200).json({ message: 'העסק הוסר מהמועדפים בהצלחה.' });
    } catch (error) {
      next(error);
    }
  }

  /**
 * שליפת כל העסקים השמורים במועדפים של הלקוח המחובר (עבור דף הבית)
 * GET /api/business/my-favorites
 */
  public static async getMyFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number((req as any).user?.userId || (req as any).user?.id);

      // שליפת כל הרשומות מטבלת Favorite המשויכות למשתמש, כולל פרטי העסק המלאים
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
          business: true // מביא את השם, הכתובת והתמונה של העסק לרינדור בדף הבית
        }
      });

      // חילוץ מערך העסקים הנקי מתוך טבלת הקשר
      const favoriteBusinesses = favorites.map(fav => fav.business);

      res.status(200).json({ favorites: favoriteBusinesses });
    } catch (error) {
      next(error);
    }
  }
  /**
 * שליפת כל חסימות הזמן וימי החופשה של העסק
 * GET /api/business/:id/blocked-times
 */
  public static async getBlockedTimes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const blockedTimes = await prisma.blockedTime.findMany({
        where: { businessId },
        include: { staff: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      });
      res.status(200).json({ blockedTimes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * הוספת חסימת זמן / חופשה נקודתית לעסק או לעובד ספציפי
   * POST /api/business/:id/blocked-times
   */
  public static async addBlockedTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);
      const { staffId, date, startTime, endTime, reason, isFullDay } = req.body;

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה לבצע פעולה זו.' });
        return;
      }

      if (!date) {
        res.status(400).json({ error: 'יש לבחור תאריך לחסימה.' });
        return;
      }

      const finalStart = isFullDay ? '00:00' : startTime;
      const finalEnd = isFullDay ? '23:59' : endTime;

      if (!finalStart || !finalEnd || finalStart >= finalEnd) {
        res.status(400).json({ error: 'טווח השעות לחסימה אינו תקין.' });
        return;
      }

      const [year, month, day] = String(date).split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      targetDate.setHours(0, 0, 0, 0);

      const created = await prisma.blockedTime.create({
        data: {
          businessId,
          staffId: staffId ? Number(staffId) : null,
          date: targetDate,
          startTime: finalStart,
          endTime: finalEnd,
          reason: reason ? String(reason).trim() : null
        },
        include: { staff: { select: { id: true, name: true } } }
      });

      res.status(201).json({ message: 'החסימה נשמרה בהצלחה ביומן.', blockedTime: created });
    } catch (error) {
      next(error);
    }
  }

  /**
   * מחיקת חסימת זמן קיימת
   * DELETE /api/business/blocked-times/:blockId
   */
  public static async deleteBlockedTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blockId = Number(req.params.blockId);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const block = await prisma.blockedTime.findUnique({
        where: { id: blockId },
        include: { business: true }
      });

      if (!block || block.business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך מורשה למחוק חסימה זו.' });
        return;
      }

      await prisma.blockedTime.delete({ where: { id: blockId } });
      res.status(200).json({ message: 'החסימה הוסרה בהצלחה.' });
    } catch (error) {
      next(error);
    }
  }
  public static async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number((req as any).user?.userId || (req as any).user?.id);
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      res.status(200).json({ notifications });
    } catch (error) {
      next(error);
    }
  }

  public static async markNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = Number((req as any).user?.userId || (req as any).user?.id);
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
      res.status(200).json({ message: 'Notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }
  public static async toggleMuteNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);
      const ownerId = Number((req as any).user?.userId || (req as any).user?.id);

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== ownerId) {
        res.status(403).json({ error: 'אינך בעל העסק המורשה.' });
        return;
      }

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: { muteNotifications: !business.muteNotifications }
      });

      res.status(200).json({ muteNotifications: updated.muteNotifications });
    } catch (error) {
      next(error);
    }
  }

}
