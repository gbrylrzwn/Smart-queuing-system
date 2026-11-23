import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

export class CrmController {
  /**
   * שליפת תיק לקוח דיגיטלי מלא (פרטים, היסטוריית ביקורים, הערות מטפל וטפסים חתומים)
   * GET /api/crm/business/:businessId/client/:clientId
   */
  public static async getClientFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.businessId);
      const clientId = Number(req.params.clientId);
      const userId = (req as any).user?.id;

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business || business.ownerId !== userId) {
        res.status(403).json({ error: 'אין לך הרשאה לצפות בתיק לקוח של עסק זה.' });
        return;
      }

      const [client, appointments, notes, forms] = await Promise.all([
        prisma.user.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, phone: true, email: true, createdAt: true },
        }),
        prisma.appointment.findMany({
            where: { businessId, clientId },
            include: {
              service: true,
              staff: true,
            },
            orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
          }),
  
        prisma.clientNote.findMany({
          where: { businessId, clientId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.signedForm.findMany({
          where: { businessId, clientId },
          orderBy: { signedAt: 'desc' },
        }),
      ]);

      if (!client) {
        res.status(404).json({ error: 'הלקוח לא נמצא במערכת.' });
        return;
      }

      res.status(200).json({
        client,
        appointments,
        notes,
        forms,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * הוספת הערת מטפל פרטית לתיק הלקוח
   * POST /api/crm/notes
   */
  public static async addClientNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { businessId, clientId, content } = req.body;

      if (!businessId || !clientId || !content?.trim()) {
        res.status(400).json({ error: 'יש להזין תוכן להערה.' });
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: Number(businessId) } });
      if (!business || business.ownerId !== userId) {
        res.status(403).json({ error: 'אין לך הרשאה להוסיף הערה לעסק זה.' });
        return;
      }

      const note = await prisma.clientNote.create({
        data: {
          businessId: Number(businessId),
          clientId: Number(clientId),
          content: content.trim(),
        },
      });

      res.status(201).json({ message: 'ההערה נשמרה בתיק הלקוח.', note });
    } catch (error) {
      next(error);
    }
  }

  /**
   * מחיקת הערת מטפל
   * DELETE /api/crm/notes/:id
   */
  public static async deleteClientNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const noteId = Number(req.params.id);

      const note = await prisma.clientNote.findUnique({
        where: { id: noteId },
        include: { business: true },
      });

      if (!note || note.business.ownerId !== userId) {
        res.status(403).json({ error: 'אין הרשאה למחוק הערה זו.' });
        return;
      }

      await prisma.clientNote.delete({ where: { id: noteId } });
      res.status(200).json({ message: 'ההערה נמחקה.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * שליחת הצהרת בריאות וטופס חתום דיגיטלית ע"י הלקוח
   * POST /api/crm/forms
   */
  public static async submitSignedForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = (req as any).user?.id;
      const { businessId, formTitle, answersJson, signatureDataUrl } = req.body;

      if (!businessId || !signatureDataUrl) {
        res.status(400).json({ error: 'חסרה חתימה דיגיטלית או פרטי עסק.' });
        return;
      }

      const form = await prisma.signedForm.create({
        data: {
          businessId: Number(businessId),
          clientId: Number(clientId),
          formTitle: formTitle || 'הצהרת בריאות והסכמה לטיפול',
          answersJson: typeof answersJson === 'string' ? answersJson : JSON.stringify(answersJson || {}),
          signatureDataUrl,
        },
      });

      res.status(201).json({ message: 'הצהרת הבריאות החתומה נשמרה בהצלחה בתיקך האישי!', form });
    } catch (error) {
      next(error);
    }
  }
}
