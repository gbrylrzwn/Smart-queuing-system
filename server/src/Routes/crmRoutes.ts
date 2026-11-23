import { Router } from 'express';
import { CrmController } from '../Controllers/crmController';
import { authMiddleware } from '../Middlewares/authMiddleware';

const router = Router();

router.get('/business/:businessId/client/:clientId', authMiddleware, CrmController.getClientFile);
router.post('/notes', authMiddleware, CrmController.addClientNote);
router.delete('/notes/:id', authMiddleware, CrmController.deleteClientNote);
router.post('/forms', authMiddleware, CrmController.submitSignedForm);

export default router;
