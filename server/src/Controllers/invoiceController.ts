import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../Config/db';

const VAT_RATE = 0.18;

const getOwnerBusiness = async (req: Request) => {
  const userId = Number((req as any).user?.userId || (req as any).user?.id);
  if (!userId || isNaN(userId)) return null;
  return prisma.business.findFirst({ where: { ownerId: userId } });
};

const computeDigitalSeal = (payload: {
  invoiceNumber: string;
  businessId: number;
  amount: number;
  clientName: string;
  issuedAt: Date;
}): string => {
  const secret = process.env.JWT_SECRET || 'smartqueue-invoice-integrity-key';
  const raw = `${payload.invoiceNumber}|${payload.businessId}|${payload.amount.toFixed(2)}|${payload.clientName}|${payload.issuedAt.toISOString()}`;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex').slice(0, 16).toUpperCase();
};

const enrichInvoiceSecurity = (inv: any) => {
  const total = Number(inv.amount || 0);
  const beforeVat = Number((total / (1 + VAT_RATE)).toFixed(2));
  const vatAmount = Number((total - beforeVat).toFixed(2));
  const digitalSeal = computeDigitalSeal({
    invoiceNumber: inv.invoiceNumber,
    businessId: inv.businessId,
    amount: total,
    clientName: inv.clientName,
    issuedAt: new Date(inv.issuedAt),
  });
  return {
    ...inv,
    beforeVat,
    vatAmount,
    vatRatePercent: 18,
    digitalSeal,
  };
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

      const invoicedAppIds = new Set(
        invoices.map((i) => i.appointmentId).filter((id): id is number => id !== null)
      );

      res.status(200).json({
        business: { id: business.id, name: business.name, address: business.address },
        invoices: invoices.map(enrichInvoiceSecurity),
        paidAppointments: paidAppointments.map((app) => ({
          ...app,
          hasInvoice: invoicedAppIds.has(app.id),
        })),
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

      if (!clientName || !serviceName || isNaN(amount) || amount <= 0 || amount > 500000) {
        res.status(400).json({ error: 'יש להזין שם לקוח, פירוט שירות וסכום חיובי תקין.' });
        return;
      }

      const created = await prisma.$transaction(async (tx) => {
        if (appointmentId) {
          const ownedApp = await tx.appointment.findFirst({
            where: { id: appointmentId, businessId: business.id },
          });
          if (!ownedApp) {
            throw new Error('FORBIDDEN_APPOINTMENT');
          }

          const duplicate = await tx.invoice.findFirst({
            where: { businessId: business.id, appointmentId },
          });
          if (duplicate) {
            throw new Error(`DUPLICATE_INVOICE:${duplicate.invoiceNumber}`);
          }
        }

        const lastInvoice = await tx.invoice.findFirst({
          where: { businessId: business.id },
          orderBy: { id: 'desc' },
          select: { invoiceNumber: true },
        });

        const year = new Date().getFullYear();
        let nextSeq = 1001;
        if (lastInvoice?.invoiceNumber) {
          const parts = lastInvoice.invoiceNumber.split('-');
          const parsed = Number(parts[parts.length - 1]);
          if (!isNaN(parsed) && parsed >= 1001) {
            nextSeq = parsed + 1;
          }
        }
        const invoiceNumber = `INV-${year}-${nextSeq}`;

        return tx.invoice.create({
          data: {
            invoiceNumber,
            businessId: business.id,
            appointmentId,
            clientName,
            clientPhone,
            clientEmail,
            clientTaxId,
            serviceName,
            amount: Number(amount.toFixed(2)),
            paymentMethod,
            notes,
          },
        });
      });

      const securedInvoice = enrichInvoiceSecurity(created);

      res.status(201).json({
        message: `אישור תשלום / מסמך עסקה מספר ${securedInvoice.invoiceNumber} הופק ונחתם בהצלחה!`,
        invoice: securedInvoice,
      });
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_APPOINTMENT') {
        res.status(403).json({ error: 'אין הרשאה להפיק מסמך עבור תור זה.' });
        return;
      }
      if (typeof error?.message === 'string' && error.message.startsWith('DUPLICATE_INVOICE:')) {
        const existingNum = error.message.split(':')[1];
        res.status(409).json({ error: `כבר הופק מסמך (${existingNum}) עבור תור זה.` });
        return;
      }
      next(error);
    }
  }
}
