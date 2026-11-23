import { Router } from 'express';
import { AppointmentController } from '../Controllers/appointmentController';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { roleMiddleware } from '../Middlewares/roleMiddleware';
import { checkActiveSubscription } from '../Middlewares/subscriptionMiddleware';

const router = Router();

// נתיבי אישור הגעה מהיר באמצעות טוקן חד-פעמי
router.get('/quick-confirm/:token', AppointmentController.getAppointmentByConfirmToken);
router.post('/quick-confirm/:token', AppointmentController.processQuickConfirm);

// צפייה בשעות פנויות בעסק
router.get('/available', checkActiveSubscription, AppointmentController.getAvailableSlots);

// נתיבי לקוח מאומת בלבד
router.get(
  '/my-orders',
  authMiddleware,
  roleMiddleware(['CLIENT']),
  AppointmentController.getClientAppointments
);

router.post(
  '/book',
  authMiddleware,
  roleMiddleware(['CLIENT']),
  checkActiveSubscription,
  AppointmentController.bookAppointment
);

// נתיב ביטול תור (פתוח ללקוח בעל התור או לבעל העסק עצמו — מאומת בבקר מול מסד הנתונים)
router.put(
  '/:id/cancel',
  authMiddleware,
  roleMiddleware(['CLIENT', 'BUSINESS_OWNER']),
  AppointmentController.cancelAppointment
);

// נתיבי ניהול נעולים לבעל העסק בלבד
router.get(
  '/business-orders',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  AppointmentController.getBusinessOrders
);

router.get(
  '/business-schedule',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  AppointmentController.getBusinessSchedule
);

router.post(
  '/manual-book',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  AppointmentController.bookManualAppointment
);

router.post(
  '/convert-waitlist/:waitlistId',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  AppointmentController.convertWaitlistToAppointment
);

router.put(
  '/:id/approve',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  AppointmentController.approveAppointment
);

router.put(
  '/:id/reject',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  AppointmentController.rejectAppointment
);

router.get(
  '/financial-report',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  (req, res, next) => {
    AppointmentController.getFinancialReport(req, res, next);
  }
);

router.put(
  '/:id/mark-as-paid',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  (req, res, next) => {
    AppointmentController.markAsPaid(req, res, next);
  }
);

router.get(
  '/business/:businessId',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  (req, res, next) => {
    AppointmentController.getBusinessAppointmentsByDate(req, res, next);
  }
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  (req, res, next) => {
    AppointmentController.deleteAppointment(req, res, next);
  }
);

export default router;
