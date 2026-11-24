import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema } from '../schemas/post.js';
import * as postController from '../controllers/postController.js';

const router = Router();


router.get('/api/v1/posts', postController.getAll);
router.get('/api/v1/posts/:id', postController.getById);

router.post(
  '/api/v1/posts',
  authenticate,
  validate(createPostSchema),
  postController.create,
);


router.put(
  '/api/v1/posts/:id',
  authenticate,
  validate(updatePostSchema),
  postController.update,
);
router.delete('/api/v1/posts/:id', authenticate, postController.remove);

export default router;
