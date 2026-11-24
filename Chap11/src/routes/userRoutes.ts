import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../schemas/user.js';
import * as userController from '../controllers/userController.js';

const router = Router();


router.get('/api/v1/users/me', authenticate, userController.getProfile);
router.put(
  '/api/v1/users/me',
  authenticate,
  validate(updateMeSchema),
  userController.updateProfile,
);


router.get('/api/v1/users', authenticate, authorize('ADMIN'), userController.getAll);
router.delete(
  '/api/v1/users/:id',
  authenticate,
  authorize('ADMIN'),
  userController.remove,
);



export default router;
