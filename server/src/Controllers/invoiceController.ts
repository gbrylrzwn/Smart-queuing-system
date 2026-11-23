import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

const getOwnerBusiness = async (req: Request) => {
  const userId = Number((req as any).user?.userId || (req as any).user?.id);
  if (!userId || isNaN(userId)) return null;
  return prisma.business.findFirst({ where: { ownerId: userId } });
};

export class InvoiceController {
  public static async getMyInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await getOwnerBusiness(req);
      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק המשויך לחשבון זה.' });
        return;
      }

      const [invoices, paidAppointments] = await Promise.all([
        prisma.invoice.findMany({
          where: { businessId: business.id },
          orderBy: { issuedAt: 'desc' },
        }),
        prisma.appointment.findMany({
          where: {
            businessId: business.id,
            status: 'PAID',
          },
          include: {
            client: { select: { name: true, phone: true, email: true } },
            service: { select: { name: true, price: true } },
          },
          orderBy: { date: 'desc' },
          take: 50,
        }),
      ]);

      res.status(200).json({
        business: { id: business.id, name: business.name, address: business.address },
        invoices,
        paidAppointments,
      });
    } catch (error) {
      next(error);
    }
  }
  public static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await getOwnerBusiness(req);
      if (!business) {
        res.status(404).json({ error: 'לא נמצא עסק המשויך לחשבון זה.' });
        return;
      }

      const clientName = String(req.body.clientName || '').trim();
      const serviceName = String(req.body.serviceName || '').trim();
      const amount = Number(req.body.amount);
      const clientPhone = req.body.clientPhone ? String(req.body.clientPhone).trim() : null;
      const clientEmail = req.body.clientEmail ? String(req.body.clientEmail).trim() : null;
      const clientTaxId = req.body.clientTaxId ? String(req.body.clientTaxId).trim() : null;
      const paymentMethod = String(req.body.paymentMethod || 'אשראי / העברה').trim();
      const notes = req.body.notes ? String(req.body.notes).trim() : null;
      const appointmentId = req.body.appointmentId ? Number(req.body.appointmentId) : null;

      if (!clientName || !serviceName || isNaN(amount) || amount <= 0) {
        res.status(400).json({ error: 'יש להזין שם לקוח, פירוט שירות וסכום חיובי תקין.' });
        return;
      }

      if (appointmentId) {
        const ownedApp = await prisma.appointment.findFirst({
          where: { id: appointmentId, businessId: business.id },
        });
        if (!ownedApp) {
          res.status(403).json({ error: 'אין הרשאה להפיק חשבונית עבור תור זה.' });
          return;
        }
      }

      const existingCount = await prisma.invoice.count({ where: { businessId: business.id } });
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${String(existingCount + 1001)}`;

      const created = await prisma.invoice.create({
        data: {
          invoiceNumber,
          businessId: business.id,
          appointmentId,
          clientName,
          clientPhone,
          clientEmail,
          clientTaxId,
          serviceName,
          amount,
          paymentMethod,
          notes,
        },
      });

      res.status(201).json({
        message: `חשבונית / קבלה מספר ${invoiceNumber} הופקה בהצלחה!`,
        invoice: created,
      });
    } catch (error) {
      next(error);
    }
  }
}
