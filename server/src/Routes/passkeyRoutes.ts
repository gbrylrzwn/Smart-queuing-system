import { Router } from 'express';
import { PasskeyController } from '../Controllers/passkeyController';
import { authMiddleware } from '../Middlewares/authMiddleware';

const router = Router();

router.post('/register-options', authMiddleware, PasskeyController.registerOptions);
router.post('/register-verify', authMiddleware, PasskeyController.registerVerify);
router.post('/login-options', PasskeyController.loginOptions);
router.post('/login-verify', PasskeyController.loginVerify);

export default router;
