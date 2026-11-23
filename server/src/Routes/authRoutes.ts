import { Router } from 'express';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { register, login, deleteMyAccount, updateProfile, sendOtp, verifyOtp } from '../Controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// נתיבי כניסה מהירה באמצעות קוד חד-פעמי ב-SMS
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

router.delete('/delete-my-account', authMiddleware, deleteMyAccount);
router.put('/update-profile', authMiddleware, updateProfile);

export default router;
