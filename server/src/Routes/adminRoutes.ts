import { Router } from 'express';
import { AdminController } from '../Controllers/adminController';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { roleMiddleware } from '../Middlewares/roleMiddleware';

const router = Router();

router.get('/overview', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.getSystemOverview);
router.put('/businesses/:id/subscription', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.updateBusinessSubscription);
router.get('/financial-report', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.getFinancialReport);
router.get('/settings', AdminController.getSystemSettings);

router.put('/settings', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.updateSystemSettings);
router.get('/billing', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.getBillingHistory);
router.post('/billing', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.createPlatformPayment);
router.put('/billing/:id/status', authMiddleware, roleMiddleware(['SUPER_ADMIN']), AdminController.updatePaymentStatus);

export default router;
