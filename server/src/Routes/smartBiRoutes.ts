import { Router } from 'express';
import { SmartBiController } from '../Controllers/smartBiController';
import { authMiddleware } from '../Middlewares/authMiddleware';

const router = Router();

router.post('/no-show/:appointmentId', authMiddleware, SmartBiController.markNoShow);
router.post('/reset-reliability/:clientId', authMiddleware, SmartBiController.resetClientReliability);
router.get('/gap-candidates', authMiddleware, SmartBiController.getGapCandidates);
router.post('/send-flash-offer', authMiddleware, SmartBiController.sendFlashOffer);

export default router;
