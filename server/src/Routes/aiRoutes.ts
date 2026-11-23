import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AiAssistantController } from '../Controllers/aiAssistantController';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  message: { error: 'שלחת שאלות רבות בזמן קצר. אנא המתן מספר דקות.' },
});

router.post('/assistant', aiLimiter, AiAssistantController.askAssistant);

export default router;
