import { Request, Response, NextFunction } from 'express';
import prisma from '../Config/db';

export class ReviewController {
  /**
   * הוספת דירוג וחוות דעת לתור שהושלם
   * POST /api/business/:id/reviews
   */
  public static async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientId = (req as any).user?.id;
      const businessId = Number(req.params.id);
      const { appointmentId, rating, comment } = req.body;

      const numericRating = Number(rating);
      if (!appointmentId || isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        res.status(400).json({ error: 'יש לבחור דירוג תקין בין 1 ל-5 כוכבים.' });
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: Number(appointmentId) },
        include: { review: true }
      });

      if (!appointment || appointment.clientId !== clientId || appointment.businessId !== businessId) {
        res.status(403).json({ error: 'לא נמצא תור תואם לדירוג.' });
        return;
      }

      if (appointment.status !== 'PAID' && appointment.status !== 'CONFIRMED') {
        res.status(400).json({ error: 'ניתן לדרג רק לאחר תור שאושר או שולם.' });
        return;
      }

      if (appointment.review) {
        res.status(400).json({ error: 'כבר שלחת חוות דעת עבור תור זה.' });
        return;
      }

      const review = await prisma.review.create({
        data: {
          rating: numericRating,
          comment: comment ? String(comment).trim() : null,
          clientId,
          businessId,
          appointmentId: appointment.id
        },
        include: {
          client: { select: { id: true, name: true } }
        }
      });

      res.status(201).json({ message: 'תודה! חוות הדעת שלך פורסמה בהצלחה.', review });
    } catch (error) {
      next(error);
    }
  }

  /**
   * שליפת כל חוות הדעת והציון הממוצע של עסק
   * GET /api/business/:id/reviews
   */
  public static async getBusinessReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = Number(req.params.id);

      const reviews = await prisma.review.findMany({
        where: { businessId },
        include: {
          client: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
          : 0;

      res.status(200).json({
        averageRating,
        totalReviews,
        reviews
      });
    } catch (error) {
      next(error);
    }
  }
}
