import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

export const checkActiveSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;

    if (user && user.role === 'BUSINESS_OWNER') {
      const ownerId = Number(user.userId || user.id);
      const business = await prisma.business.findFirst({
        where: { ownerId },
        select: { subscriptionStatus: true }
      });

      if (business && business.subscriptionStatus === 'SUSPENDED') {
        res.status(403).json({
          error: 'חשבון העסק מושעה זמנית. לא ניתן לבצע פעולות ניהול במערכת.'
        });
        return;
      }
    }

    const rawBusinessId = req.params.id || req.body?.businessId || req.query?.businessId;
    if (rawBusinessId && !isNaN(Number(rawBusinessId))) {
      const businessId = Number(rawBusinessId);
      const targetBusiness = await prisma.business.findUnique({
        where: { id: businessId },
        select: { subscriptionStatus: true }
      });

      if (targetBusiness && targetBusiness.subscriptionStatus === 'SUSPENDED') {
        res.status(403).json({
          error: 'עסק זה אינו זמין כרגע לקבלת תורים.'
        });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
