import { Router } from 'express';
import { BusinessController } from '../Controllers/businessController';
import { authMiddleware } from '../Middlewares/authMiddleware';
import { roleMiddleware } from '../Middlewares/roleMiddleware';
import { checkActiveSubscription } from '../Middlewares/subscriptionMiddleware';
import { ReviewController } from '../Controllers/reviewController';

const router = Router();

router.get('/all', BusinessController.getAllBusinesses);

router.post(
  '/create',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  BusinessController.createBusiness
);

router.post(
  '/:id/services',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  BusinessController.addService
);

router.get('/my-favorites', authMiddleware, BusinessController.getMyFavorites);

router.post(
  '/:id/staff',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  BusinessController.addStaff
);

router.get(
  '/my-business',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  BusinessController.getMyBusiness
);

router.delete(
  '/delete-my-business',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  BusinessController.deleteBusiness
);

router.put(
  '/update-my-business',
  authMiddleware,
  roleMiddleware(['BUSINESS_OWNER']),
  checkActiveSubscription,
  BusinessController.updateBusiness
);

router.put('/:id/working-hours', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.updateWorkingHours);
router.put('/services/:serviceId', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.updateService);
router.delete('/services/:serviceId', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.deleteService);

router.put('/staff/:staffId', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.updateStaff);
router.delete('/staff/:staffId', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.deleteStaff);
router.put('/staff/:staffId/working-hours', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.updateStaffWorkingHours);

router.get('/:id/blocked-times', authMiddleware, BusinessController.getBlockedTimes);
router.post('/:id/blocked-times', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.addBlockedTime);
router.delete('/blocked-times/:blockId', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), checkActiveSubscription, BusinessController.deleteBlockedTime);

router.get('/:id', authMiddleware, checkActiveSubscription, BusinessController.getBusinessProfile);

router.post('/:id/favorite', authMiddleware, roleMiddleware(['CLIENT']), checkActiveSubscription, BusinessController.addToFavorites);
router.delete('/:id/favorite', authMiddleware, roleMiddleware(['CLIENT']), BusinessController.removeFromFavorites);
router.get('/notifications/my', authMiddleware, BusinessController.getMyNotifications);
router.put('/notifications/read-all', authMiddleware, BusinessController.markNotificationsRead);
router.put('/:id/toggle-mute', authMiddleware, roleMiddleware(['BUSINESS_OWNER']), BusinessController.toggleMuteNotifications);
router.get('/:id/reviews', authMiddleware, ReviewController.getBusinessReviews);
router.post('/:id/reviews', authMiddleware, roleMiddleware(['CLIENT']), ReviewController.createReview);

export default router;
