import { Router } from 'express';
import { GoogleCalendarController } from '../Controllers/googleCalendarController';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { roleMiddleware } from '../Middlewares/roleMiddleware';

const router = Router();

router.get('/auth-url', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), GoogleCalendarController.getAuthUrl);
router.get('/callback', GoogleCalendarController.handleCallback);

export default router;
